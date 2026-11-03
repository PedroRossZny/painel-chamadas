import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { getPool } from '../database';

export interface CallRow {
  id: number;
  patient_name: string;
  doctor_name: string;
  sector_id: number;
  status: 'waiting' | 'calling' | 'called' | 'no_show';
  call_attempts: number;
  created_at: Date;
  started_at: Date | null;
  last_called_at: Date | null;
  expires_at: Date | null;
}

interface ReportRow {
  patient_name: string;
  sector: string;
  doctor_name: string;
  attended_at: Date;
}

const MAX_ATTEMPTS = 3;

@Injectable()
export class CallService {
  private readonly pool = getPool();

  async createCall(patientName: string, doctorName: string, sectorId: number) {
    const sector = await this.pool.query(
      `SELECT id FROM sector WHERE id = $1`,
      [sectorId],
    );

    if (sector.rows.length === 0) {
      throw new NotFoundException('Setor não encontrado.');
    }

    const result = await this.pool.query<CallRow>(
      `
      INSERT INTO call (
        patient_name,
        doctor_name,
        sector_id,
        status,
        call_attempts,
        last_called_at,
        expires_at
      )
      VALUES ($1, $2, $3, 'waiting', 0, NULL, NULL)
      RETURNING *
      `,
      [patientName, doctorName, sectorId],
    );

    return result.rows[0];
  }

  /** Puts the call back in the queue. The attempt counter goes up when the panel plays it. */
  async retryCall(callId: number) {
    const result = await this.pool.query<{
      id: number;
      call_attempts: number;
    }>(
      `
      UPDATE call
      SET status = 'waiting'
      WHERE id = $1
        AND call_attempts < $2
      RETURNING id, call_attempts
      `,
      [callId, MAX_ATTEMPTS],
    );

    if (result.rowCount === 0) {
      return {
        success: false,
        message: 'Limite de tentativas atingido',
      };
    }

    return {
      success: true,
      callId: result.rows[0].id,
      nextAttempt: result.rows[0].call_attempts + 1,
    };
  }

  async generateReport(date: string): Promise<StreamableFile> {
    const result = await this.pool.query<ReportRow>(
      `
      SELECT
        ap.patient_name,
        s.name AS sector,
        ap.doctor_name,
        ap.attended_at
      FROM attended_patient ap
      JOIN sector s ON s.id = ap.sector_id
      WHERE ap.attended_at::date = $1
      ORDER BY ap.attended_at ASC
      `,
      [date],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Nenhum paciente atendido nesta data.');
    }

    const doc = new PDFDocument({ margin: 40 });
    const stream = new PassThrough();

    doc.pipe(stream);

    doc.fontSize(16).text('Relatório de Pacientes Atendidos', {
      align: 'center',
    });

    doc.moveDown();
    doc.fontSize(12).text(`Data: ${date}`, { align: 'right' });

    doc.moveDown();

    for (const row of result.rows) {
      const time = new Date(row.attended_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.text(
        `${time} - ${row.patient_name} | Setor: ${row.sector} | CC: ${row.doctor_name}`,
      );

      doc.moveDown(0.5);
    }

    doc.end();

    return new StreamableFile(stream, {
      disposition: `attachment; filename=relatorio_atendidos_${date}.pdf`,
      type: 'application/pdf',
    });
  }

  async listCalls() {
    const result = await this.pool.query<
      Pick<CallRow, 'id' | 'patient_name' | 'doctor_name' | 'status'> & {
        sector: string;
        created_at: Date;
      }
    >(
      `
      SELECT
        c.id,
        c.patient_name,
        c.doctor_name,
        s.name AS sector,
        c.status,
        c.created_at
      FROM call c
      JOIN sector s ON s.id = c.sector_id
      ORDER BY c.created_at DESC
      `,
    );

    return result.rows;
  }

  async getLastCall(sectorId: number) {
    const result = await this.pool.query<CallRow>(
      `
      SELECT *
      FROM call
      WHERE status = 'calling'
        AND sector_id = $1
      ORDER BY started_at DESC
      LIMIT 1
      `,
      [sectorId],
    );

    return result.rows[0] ?? null;
  }

  async getWaitingCalls(sectorId: number) {
    const result = await this.pool.query<CallRow>(
      `
      SELECT *
      FROM call
      WHERE status = 'waiting'
        AND sector_id = $1
      ORDER BY created_at ASC
      `,
      [sectorId],
    );

    return result.rows;
  }
}
