import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheTags } from '../../cache/cache-tags.decorator';
import { Public } from '../../common/decorators/access.decorators';
import { Mission3011DashboardService } from './mission3011-dashboard.service';

@ApiTags('public')
@Controller('public/mission3011')
export class Mission3011PublicController {
  constructor(private readonly dashboard: Mission3011DashboardService) {}

  @Get('dashboard')
  @Public()
  @CacheTags('mission3011')
  async getDashboard() {
    return this.dashboard.build();
  }
}
