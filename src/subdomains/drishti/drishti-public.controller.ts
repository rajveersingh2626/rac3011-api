import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheTags } from '../../cache/cache-tags.decorator';
import { Public } from '../../common/decorators/access.decorators';
import { DrishtiDashboardService } from './drishti-dashboard.service';

@ApiTags('public')
@Controller('public/drishti')
export class DrishtiPublicController {
  constructor(private readonly dashboard: DrishtiDashboardService) {}

  @Get('dashboard')
  @Public()
  @CacheTags('drishti')
  async getDashboard() {
    return this.dashboard.build();
  }
}
