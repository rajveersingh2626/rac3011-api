import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/access.decorators';
import { SkillTagsService } from './skill-tags.service';
import { skillTagDto } from './members.transformer';

@ApiTags('skill-tags')
@Controller('skill-tags')
export class SkillTagsController {
  constructor(private readonly skillTags: SkillTagsService) {}

  @Get()
  @Authenticated()
  async list() {
    return (await this.skillTags.list()).map(skillTagDto);
  }
}
