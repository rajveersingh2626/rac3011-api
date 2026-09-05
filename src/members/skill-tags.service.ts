import { Injectable } from '@nestjs/common';
import { SkillTagsRepository } from './skill-tags.repository';
import type { SkillTagRow } from './members.types';

@Injectable()
export class SkillTagsService {
  constructor(private readonly repo: SkillTagsRepository) {}

  list(): Promise<SkillTagRow[]> {
    return this.repo.findAll();
  }
}
