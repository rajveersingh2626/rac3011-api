import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/access.decorators';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health')
  @Public()
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  async ready(): Promise<{ status: 'ok' | 'degraded'; database: boolean }> {
    const database = await this.health.databaseReachable();
    return { status: database ? 'ok' : 'degraded', database };
  }
}
