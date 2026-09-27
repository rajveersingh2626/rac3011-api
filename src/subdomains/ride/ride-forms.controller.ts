import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { extractClientIp } from '../../auth/cookie.util';
import { Public, RequirePermission } from '../../common/decorators/access.decorators';
import { CurrentParticipant } from './decorators/current-participant.decorator';
import {
  CreateRideFormDto,
  SubmitRideFormDto,
  UpdateRideFormDto,
  UpdateSubmissionStatusDto,
} from './dto/ride-form.dto';
import { ParticipantAuthGuard } from './guards/participant-auth.guard';
import { RIDE_MANAGE_PERMISSIONS } from './ride-base.service';
import { RideFormsService } from './ride-forms.service';

@ApiTags('ride')
@Controller('ride')
export class RideFormsController {
  constructor(private readonly service: RideFormsService) {}

  // ==========================================
  // ADMIN FORMS CRUD & SUBMISSIONS MANAGEMENT
  // ==========================================

  @Get('forms')
  @RequirePermission(...RIDE_MANAGE_PERMISSIONS)
  async listAdminForms() {
    return this.service.listAdminForms();
  }

  @Post('forms')
  @RequirePermission(...RIDE_MANAGE_PERMISSIONS)
  async createForm(@Body() dto: CreateRideFormDto) {
    return this.service.createForm(dto);
  }

  @Get('forms/:id')
  @RequirePermission(...RIDE_MANAGE_PERMISSIONS)
  async getForm(@Param('id') id: string) {
    return this.service.getFormByIdOrSlug(id);
  }

  @Put('forms/:id')
  @RequirePermission(...RIDE_MANAGE_PERMISSIONS)
  async updateForm(@Param('id') id: string, @Body() dto: UpdateRideFormDto) {
    return this.service.updateForm(id, dto);
  }

  @Delete('forms/:id')
  @RequirePermission(...RIDE_MANAGE_PERMISSIONS)
  async deleteForm(@Param('id') id: string) {
    return this.service.deleteForm(id);
  }

  @Get('forms/:id/submissions')
  @RequirePermission(...RIDE_MANAGE_PERMISSIONS)
  async listFormSubmissions(
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.service.listFormSubmissions(id, status);
  }

  @Patch('forms/:formId/submissions/:subId/status')
  @RequirePermission(...RIDE_MANAGE_PERMISSIONS)
  async updateSubmissionStatus(
    @Param('formId') formId: string,
    @Param('subId') subId: string,
    @Body() dto: UpdateSubmissionStatusDto,
  ) {
    return this.service.updateSubmissionReviewStatus(
      formId,
      subId,
      dto.status,
      dto.notes,
    );
  }

  // ==========================================
  // PARTICIPANT QUESTIONNAIRE ENDPOINTS
  // ==========================================

  @Get('participant/forms/active')
  @Public()
  @UseGuards(ParticipantAuthGuard)
  async getActiveFormsForParticipant(@CurrentParticipant() participant: any) {
    return this.service.getActiveFormsForParticipant(participant);
  }

  @Post('participant/forms/:id/submit')
  @Public()
  @UseGuards(ParticipantAuthGuard)
  async submitFormForParticipant(
    @Param('id') id: string,
    @CurrentParticipant() participant: any,
    @Body() dto: SubmitRideFormDto,
    @Req() req: Request,
  ) {
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.service.submitFormForParticipant(
      id,
      participant,
      dto.values,
      ip ?? undefined,
      userAgent,
    );
  }
}
