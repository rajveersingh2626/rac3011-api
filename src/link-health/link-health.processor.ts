import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { LinkHealthService } from './link-health.service';

@Processor('link-health')
export class LinkHealthProcessor extends WorkerHost {
  constructor(private readonly service: LinkHealthService) {
    super();
  }

  async process(job: Job<{ id: string } | undefined>): Promise<void> {
    if (job.name === 'recheck-one' && job.data?.id) await this.service.recheckOne(job.data.id);
    else await this.service.recheckAll();
  }
}
