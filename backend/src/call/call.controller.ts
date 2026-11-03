import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { parseDate, parseId, parseName } from '../common/validation';
import { CallService } from './call.service';

interface CreateCallBody {
  patientName?: unknown;
  doctorName?: unknown;
  sectorId?: unknown;
}

@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

  /** Puts a patient in the queue of a room. The panel announces it on its next round. */
  @Post()
  createCall(@Body() body: CreateCallBody) {
    return this.callService.createCall(
      parseName(body?.patientName, 'patientName'),
      parseName(body?.doctorName, 'doctorName'),
      parseId(body?.sectorId, 'sectorId'),
    );
  }

  /** Calls the same patient again, up to three attempts. */
  @Post('retry')
  retry(@Body() body: { callId?: unknown }) {
    return this.callService.retryCall(parseId(body?.callId, 'callId'));
  }

  /** PDF with the patients called on a date (YYYY-MM-DD). */
  @Get('report')
  generateReport(@Query('date') date: string) {
    return this.callService.generateReport(parseDate(date));
  }

  @Get()
  listCalls() {
    return this.callService.listCalls();
  }

  @Get('last/:sectorId')
  getLastCall(@Param('sectorId') sectorId: string) {
    return this.callService.getLastCall(parseId(sectorId, 'sectorId'));
  }

  @Get('waiting/:sectorId')
  getWaitingCalls(@Param('sectorId') sectorId: string) {
    return this.callService.getWaitingCalls(parseId(sectorId, 'sectorId'));
  }
}
