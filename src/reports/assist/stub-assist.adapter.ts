import { Injectable } from '@nestjs/common';
import type { AssistRequest, AssistResult } from './assist.port';
import { AssistPort } from './assist.port';

@Injectable()
export class StubAssistAdapter extends AssistPort {
  assist(request: AssistRequest): Promise<AssistResult> {
    const values = request.values as { activities?: unknown[] } | null;
    const activityCount = Array.isArray(values?.activities) ? values.activities.length : 0;
    return Promise.resolve({
      summary: `${request.clubName} logged ${activityCount} activit${activityCount === 1 ? 'y' : 'ies'} for ${request.month}.`,
      suggestions: request.notes
        ? [{ message: `Officer note on file: "${request.notes.slice(0, 200)}"` }]
        : [{ message: 'No notes were left for this month.' }],
    });
  }
}
