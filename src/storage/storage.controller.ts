import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Authenticated } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { CreateGrantDto, FinaliseGrantDto } from './dto/create-grant.dto';
import { StorageService } from './storage.service';

@ApiTags('files')
@Controller()
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('files/grants')
  @Authenticated()
  createGrant(@CurrentUser() ctx: RequestContext, @Body() dto: CreateGrantDto) {
    return this.storage.createGrant(ctx, dto);
  }

  @Patch('files/grants/:grantId')
  @Authenticated()
  finaliseGrant(
    @CurrentUser() ctx: RequestContext,
    @Param('grantId') grantId: string,
    @Body() dto: FinaliseGrantDto,
  ) {
    return this.storage.finaliseGrant(ctx, grantId, dto.providerKey);
  }

  @Get('files/:id')
  @Authenticated()
  async getFile(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.storage.getFile(ctx, id);
    if ('redirectUrl' in file) {
      res.redirect(301, file.redirectUrl);
      return;
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    file.stream.pipe(res);
  }

  @Delete('files/:id')
  @HttpCode(204)
  @Authenticated()
  async deleteFile(@CurrentUser() ctx: RequestContext, @Param('id') id: string): Promise<void> {
    await this.storage.deleteFile(ctx, id);
  }
}
