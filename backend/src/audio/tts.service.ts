import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Turns the call sentence into an MP3 with Microsoft Edge's online voices (edge-tts). */
@Injectable()
export class TtsService {
  private readonly audioDir = path.resolve(process.cwd(), 'audios');
  private readonly python = process.env.PYTHON_BIN ?? 'python';
  private readonly voice = process.env.TTS_VOICE ?? 'pt-BR-AntonioNeural';

  constructor() {
    fs.mkdirSync(this.audioDir, { recursive: true });
  }

  async generateAudio(text: string): Promise<string> {
    const fileName = `${randomUUID()}.mp3`;
    const outputPath = path.join(this.audioDir, fileName);

    try {
      // execFile passes each argument as is, without a shell. "--text=" keeps
      // a name that starts with "-" from being read as another option.
      await execFileAsync(
        this.python,
        [
          '-m',
          'edge_tts',
          `--voice=${this.voice}`,
          `--text=${text}`,
          `--write-media=${outputPath}`,
        ],
        { windowsHide: true },
      );
    } catch (err: unknown) {
      const { stderr, message } = err as { stderr?: string; message?: string };
      throw new Error(`edge-tts falhou: ${stderr?.trim() || message}`);
    }

    return `/audios/${fileName}`;
  }
}
