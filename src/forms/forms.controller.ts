import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { UpdateSubmissionStatusDto } from './dto/update-submission-status.dto';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @RequirePermission('forms:manage', 'forms:responses:view', 'roles:manage')
  async listForms() {
    return this.formsService.listForms();
  }

  @Post()
  @RequirePermission('forms:manage', 'roles:manage')
  async createForm(@CurrentUser() ctx: RequestContext, @Body() dto: CreateFormDto) {
    return this.formsService.createForm(ctx, dto);
  }

  @Get('dashboard-active')
  @Authenticated()
  async getDashboardActiveForms(@CurrentUser() ctx: RequestContext) {
    return this.formsService.getDashboardActiveForms(ctx);
  }

  @Get(':id')
  @RequirePermission('forms:manage', 'forms:responses:view', 'roles:manage')
  async getForm(@Param('id') id: string) {
    return this.formsService.getForm(id);
  }

  @Patch(':id')
  @RequirePermission('forms:manage', 'roles:manage')
  async updateForm(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formsService.updateForm(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermission('forms:manage', 'roles:manage')
  @HttpCode(204)
  async deleteForm(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    await this.formsService.deleteForm(ctx, id);
  }

  @Post(':id/submit')
  @Authenticated()
  async submitForm(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: SubmitFormDto,
  ) {
    return this.formsService.submitForm(ctx, id, dto);
  }

  @Get(':id/submissions')
  @RequirePermission('forms:responses:view', 'forms:manage', 'roles:manage')
  async listSubmissions(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.formsService.listSubmissions(id, { status, search });
  }

  @Patch(':id/submissions/:subId/status')
  @RequirePermission('forms:responses:view', 'forms:manage', 'roles:manage')
  async updateSubmissionStatus(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() dto: UpdateSubmissionStatusDto,
  ) {
    return this.formsService.updateSubmissionStatus(ctx, id, subId, dto);
  }
}
