import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { parseId } from '../common/validation';
import { allowedOrigins } from '../config';
import { AudioService } from './audio.service';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  /** Server-Sent Events stream that the TV panel of an area listens to. */
  @Get('stream/area/:areaId')
  stream(
    @Param('areaId') areaId: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const area = parseId(areaId, 'areaId');

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      Vary: 'Origin',
    };

    // writeHead goes straight to Node and skips the headers added by
    // @fastify/cors, so the allowed origin is set here as well.
    const origin = req.headers.origin;
    if (origin && allowedOrigins().includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    }

    res.raw.writeHead(200, headers);
    res.raw.write(': connected\n\n');

    this.audioService.registerClient(area, res.raw);
  }

  @Post('finish')
  finish(@Body() body: { audioId?: unknown }) {
    return this.audioService.finishAudio(parseId(body?.audioId, 'audioId'));
  }
}
