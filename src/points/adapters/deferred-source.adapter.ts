import { Injectable } from '@nestjs/common';
import type { AdapterInput, PointSourceAdapter } from './point-source.port';

// event_attendance/project_collaboration/ride_hosting/club_events: their source tables belong to
// later phases; this keeps every seeded rule resolvable (zero input) until each gets a real adapter.
@Injectable()
export class DeferredSourceAdapter implements PointSourceAdapter {
  inputs(): Promise<AdapterInput[]> {
    return Promise.resolve([]);
  }
}
