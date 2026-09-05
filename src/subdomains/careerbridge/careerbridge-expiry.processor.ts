import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { CareerbridgeListingsRepository } from './careerbridge-listings.repository';

@Processor('careerbridge-expiry')
export class CareerbridgeExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger('CareerbridgeExpiry');

  constructor(private readonly repo: CareerbridgeListingsRepository) {
    super();
  }

  async process(job: Job): Promise<void> {
    const count = await this.repo.expireDue(new Date());
    this.logger.log(`[job ${job.id}] expired ${count} listing(s) past their expiresAt`);
  }
}
