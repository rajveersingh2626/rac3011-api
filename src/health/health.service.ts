import { Injectable } from '@nestjs/common';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(private readonly repo: HealthRepository) {}

  databaseReachable(): Promise<boolean> {
    return this.repo.ping();
  }
}
