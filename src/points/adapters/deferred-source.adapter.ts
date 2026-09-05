import { Injectable } from '@nestjs/common';
import type { AdapterInput, PointSourceAdapter } from './point-source.port';

// project_collaboration/club_events: no adapter yet, so every seeded rule stays resolvable (zero input).
@Injectable()
export class DeferredSourceAdapter implements PointSourceAdapter {
  inputs(): Promise<AdapterInput[]> {
    return Promise.resolve([]);
  }
}
