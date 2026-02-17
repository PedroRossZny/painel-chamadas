import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CallService } from './call.service';

@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}
  @Post('retry')
  async retry(@Body() body: { callId: number }) {
    return this.callService.retryCall(body.callId);
  }

  // Endpoint para criar uma nova chamada
  @Post()
  async createCall(
    @Body()
    body: {
      patientName: string;
      doctorName: string;
      sectorId: number;
    },
  ) {
    return this.callService.createCall(
      body.patientName,
      body.doctorName,
      body.sectorId,
    );
  }
  @Get('report')
  generateReport(@Query('date') date: string) {
    return this.callService.generateReport(date);
  }
  // Endpoint para listar todas as chamadas
  @Get()
  async listCalls() {
    return this.callService.listCalls();
  }
  // Endpoint para obter a última chamada de um setor
  @Get('last/:sectorId')
  async getLastCall(@Param('sectorId') sectorId: number) {
    return this.callService.getLastCall(Number(sectorId));
  }

  // Endpoint para obter chamadas em espera de um setor
  @Get('waiting/:sectorId')
  async getWaitingCalls(@Param('sectorId') sectorId: number) {
    return this.callService.getWaitingCalls(Number(sectorId));
  }
}
