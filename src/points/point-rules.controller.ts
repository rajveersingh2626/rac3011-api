import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated, RequirePermission } from '../common/decorators/access.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestContext } from '../common/types/access';
import { CreatePointRuleDto, UpdatePointRuleDto } from './dto/point-rule.dto';
import { PointRulesService } from './point-rules.service';
import { categoryDto, ruleDto } from './points.transformer';

@ApiTags('points')
@Controller('point-categories')
export class PointCategoriesController {
  constructor(private readonly service: PointRulesService) {}

  @Get()
  @Authenticated()
  async list() {
    return (await this.service.listCategories()).map(categoryDto);
  }
}

@ApiTags('points')
@Controller('point-rules')
export class PointRulesController {
  constructor(private readonly service: PointRulesService) {}

  @Get()
  @RequirePermission('point_rules:manage')
  async list(@Query('ryYear') ryYear: string) {
    const year = ryYear ? Number(ryYear) : new Date().getUTCFullYear();
    const items = await this.service.listRules(year);
    return { items: items.map(ruleDto) };
  }

  @Post()
  @RequirePermission('point_rules:manage')
  async create(@CurrentUser() ctx: RequestContext, @Body() dto: CreatePointRuleDto) {
    return ruleDto(await this.service.createRule(ctx.access, dto));
  }

  @Patch(':id')
  @RequirePermission('point_rules:manage')
  async update(
    @CurrentUser() ctx: RequestContext,
    @Param('id') id: string,
    @Body() dto: UpdatePointRuleDto,
  ) {
    return ruleDto(await this.service.updateRule(ctx.access, id, dto));
  }
}
