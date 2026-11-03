import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ServerResponse } from 'http';
import { getPool } from '../database';
import { buildSpeechText } from './speech-text';
import { TtsService } from './tts.service';

/** Event sent to the panels of an area when a patient is called. */
export interface AudioEvent {
  audioId: number;
  callId: number;
  patientName: string;
  doctorName: string;
  sector: string;
  attempt: number;
  text: string;
  audioUrl: string;
}

interface NextCallRow {
  call_id: number;
  patient_name: string;
  doctor_name: string;
  call_attempts: number;
  sector_id: number;
  sector: string;
}

const DISPATCH_INTERVAL_MS = 500;
const STALE_AUDIO_SECONDS = 60;

@Injectable()
export class AudioService implements OnModuleDestroy {
  private readonly pool = getPool();

  // Panels connected to the event stream, grouped by area.
  private readonly clients = new Map<number, Set<ServerResponse>>();

  private dispatching = false;
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly ttsService: TtsService) {
    this.timer = setInterval(() => {
      void this.dispatchAudios();
    }, DISPATCH_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  registerClient(areaId: number, res: ServerResponse) {
    if (!this.clients.has(areaId)) {
      this.clients.set(areaId, new Set());
    }

    this.clients.get(areaId)!.add(res);

    res.on('close', () => {
      this.clients.get(areaId)?.delete(res);
    });
  }

  /**
   * Runs every 500 ms. For each area with a panel open, takes the next
   * waiting call (if nothing is playing there) and sends it to every panel.
   */
  private async dispatchAudios() {
    if (this.dispatching) return;

    this.dispatching = true;

    try {
      await this.finishStaleAudios();

      for (const [areaId, clients] of this.clients.entries()) {
        if (clients.size === 0) continue;

        const audio = await this.getNextAudioByArea(areaId);
        if (!audio) continue;

        for (const client of clients) {
          client.write(`data: ${JSON.stringify(audio)}\n\n`);
        }
      }
    } catch (err) {
      // Without this catch, a failure (database offline, no internet for the
      // voice) would be an unhandled rejection and stop the server. The call
      // stays waiting and is tried again on the next round.
      console.error('[AUDIO] Falha ao preparar a chamada:', err);
    } finally {
      this.dispatching = false;
    }
  }

  /**
   * The panel reports the end of each announcement. If it is closed or
   * reloaded in the middle of one, that report never comes and the area
   * would stay blocked, so announcements playing for more than a minute
   * are closed here the same way as in finishAudio.
   */
  private async finishStaleAudios() {
    await this.pool.query(`
      WITH stale AS (
        UPDATE audio_queue
        SET status = 'done'
        WHERE status = 'playing'
          AND created_at < NOW() - INTERVAL '${STALE_AUDIO_SECONDS} seconds'
        RETURNING call_id
      )
      UPDATE call
      SET status = CASE
        WHEN call_attempts >= 3 OR expires_at < NOW()
          THEN 'no_show'
        ELSE 'called'
      END
      WHERE status = 'calling'
        AND id IN (SELECT call_id FROM stale)
    `);
  }

  private async getNextAudioByArea(areaId: number): Promise<AudioEvent | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Only one announcement at a time per area, so they don't overlap.
      const playing = await client.query(
        `
      SELECT 1
      FROM audio_queue aq
      JOIN call c ON c.id = aq.call_id
      JOIN sector s ON s.id = c.sector_id
      WHERE aq.status = 'playing'
        AND s.area_id = $1
      LIMIT 1
      `,
        [areaId],
      );

      if (playing.rows.length > 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Oldest waiting call of the area that still has attempts and time left.
      const result = await client.query<NextCallRow>(
        `
      SELECT
        c.id AS call_id,
        c.patient_name,
        c.doctor_name,
        c.call_attempts,
        c.sector_id,
        s.name AS sector
      FROM call c
      JOIN sector s ON s.id = c.sector_id
      WHERE s.area_id = $1
        AND c.status = 'waiting'
        AND c.call_attempts < 3
        AND (
          c.expires_at IS NULL
          OR c.expires_at >= NOW()
        )
      ORDER BY c.created_at
      FOR UPDATE OF c SKIP LOCKED
      LIMIT 1
      `,
        [areaId],
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const call = result.rows[0];
      const attempt = call.call_attempts + 1;

      // The five minute window starts on the first call.
      await client.query(
        `
      UPDATE call
      SET
        status = 'calling',
        call_attempts = $1,
        last_called_at = NOW(),
        started_at = COALESCE(started_at, NOW()),
        expires_at = CASE
          WHEN expires_at IS NULL THEN NOW() + INTERVAL '5 minutes'
          ELSE expires_at
        END
      WHERE id = $2
      `,
        [attempt, call.call_id],
      );

      // Same transaction as the update above: a second connection would wait
      // for the lock this one holds on the call row and never finish.
      await client.query(
        `
      INSERT INTO attended_patient (
        call_id,
        patient_name,
        doctor_name,
        sector_id
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (call_id) DO NOTHING
      `,
        [call.call_id, call.patient_name, call.doctor_name, call.sector_id],
      );

      const speechText = buildSpeechText(
        {
          patientName: call.patient_name,
          doctorName: call.doctor_name,
          sector: call.sector,
        },
        attempt,
      );

      const audioUrl = await this.ttsService.generateAudio(speechText);

      const audioInsert = await client.query<{ id: number }>(
        `
      INSERT INTO audio_queue (
        call_id,
        status,
        audio_text,
        audio_path
      )
      VALUES ($1, 'playing', $2, $3)
      RETURNING id
      `,
        [call.call_id, speechText, audioUrl],
      );

      await client.query('COMMIT');

      return {
        audioId: audioInsert.rows[0].id,
        callId: call.call_id,
        patientName: call.patient_name,
        doctorName: call.doctor_name,
        sector: call.sector,
        attempt,
        text: speechText,
        audioUrl,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Called by the panel when the announcement ends, so the next one can play. */
  async finishAudio(audioId: number) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
      UPDATE audio_queue
      SET status = 'done'
      WHERE id = $1
      `,
        [audioId],
      );

      // After the third attempt or five minutes, the patient is a no-show.
      await client.query(
        `
      UPDATE call
      SET status = CASE
        WHEN call_attempts >= 3 OR expires_at < NOW()
          THEN 'no_show'
        ELSE 'called'
      END
      WHERE id = (
        SELECT call_id
        FROM audio_queue
        WHERE id = $1
      )
      `,
        [audioId],
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
