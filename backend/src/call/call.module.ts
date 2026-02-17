import { Module } from '@nestjs/common';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { AudioModule } from '../audio/audio.module';

@Module({
  imports: [AudioModule],
  providers: [CallService],
  controllers: [CallController],
})
export class CallModule {}
