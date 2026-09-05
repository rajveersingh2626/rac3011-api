import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DirectoryController } from './directory.controller';
import { DirectoryRepository } from './directory.repository';
import { DirectoryService } from './directory.service';
import { MembersController } from './members.controller';
import { MembersImportsController } from './members-imports.controller';
import { MembersImportsService } from './members-imports.service';
import { MembersRepository } from './members.repository';
import { MembersService } from './members.service';
import { SkillTagsController } from './skill-tags.controller';
import { SkillTagsRepository } from './skill-tags.repository';
import { SkillTagsService } from './skill-tags.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 3600000, limit: 5 }])],
  controllers: [
    MembersController,
    MembersImportsController,
    DirectoryController,
    SkillTagsController,
  ],
  providers: [
    MembersRepository,
    MembersService,
    MembersImportsService,
    DirectoryRepository,
    DirectoryService,
    SkillTagsRepository,
    SkillTagsService,
  ],
  exports: [MembersService],
})
export class MembersModule {}
