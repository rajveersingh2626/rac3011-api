import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';

function currentCalendarYear(): number {
  return new Date().getUTCFullYear();
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  async recordVisit(): Promise<{ year: number; count: number }> {
    const year = currentCalendarYear();
    const count = await this.repo.incrementVisits(year);
    return { year, count: Number(count) };
  }

  async currentVisits(): Promise<{ year: number; count: number }> {
    const year = currentCalendarYear();
    const count = await this.repo.visitsForYear(year);
    return { year, count: Number(count) };
  }
}
