import { Module } from '@nestjs/common';
import { env } from '../config/env';
import { AnthropicAssistAdapter } from './assist/anthropic-assist.adapter';
import { AssistPort } from './assist/assist.port';
import { StubAssistAdapter } from './assist/stub-assist.adapter';
import { ReportRequestsController } from './report-requests.controller';
import { ReportRequestsRepository } from './report-requests.repository';
import { ReportRequestsService } from './report-requests.service';
import { ReportSchemasController } from './report-schemas.controller';
import { ReportSchemasRepository } from './report-schemas.repository';
import { ReportSchemasService } from './report-schemas.service';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

const assistProvider =
  env.ASSIST_DRIVER === 'live'
    ? { provide: AssistPort, useClass: AnthropicAssistAdapter }
    : { provide: AssistPort, useExisting: StubAssistAdapter };

@Module({
  controllers: [ReportSchemasController, ReportsController, ReportRequestsController],
  providers: [
    ReportSchemasRepository,
    ReportSchemasService,
    ReportsRepository,
    ReportsService,
    ReportRequestsRepository,
    ReportRequestsService,
    StubAssistAdapter,
    AnthropicAssistAdapter,
    assistProvider,
  ],
  exports: [ReportSchemasService],
})
export class ReportsModule {}
