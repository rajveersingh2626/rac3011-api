import { Injectable } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { ProjectKey, ProjectSummaryRegistry } from './project-summary.registry';

const INITIATIVE_META: Record<ProjectKey, { label: string; description: string }> = {
  mission3011: {
    label: 'Mission 3011',
    description: 'District-wide blood donation drive, target 3,011 units.',
  },
  drishti: {
    label: 'Drishti',
    description: 'Cataract screening and surgery pipeline, target 100 surgeries.',
  },
  rcl: {
    label: 'RCL',
    description: 'Rotaract Cricket League — team registration, fixtures and standings.',
  },
  careerbridge: {
    label: 'Career Bridge',
    description: 'Job, internship and mentorship listings for Rotaractors.',
  },
  ride: { label: 'RIDE', description: 'Inbound delegation hosting across the district’s clubs.' },
};

export type InitiativeCard =
  | { key: ProjectKey; label: string; description: string; status: 'unassigned' }
  | {
      key: ProjectKey;
      label: string;
      description: string;
      status: 'unreachable';
      leadClubId: string;
    }
  | {
      key: ProjectKey;
      label: string;
      description: string;
      status: 'active';
      leadClubId: string;
      summary: Awaited<ReturnType<NonNullable<ReturnType<ProjectSummaryRegistry['get']>>>>;
    };

@Injectable()
export class PublicInitiativesService {
  constructor(
    private readonly content: ContentService,
    private readonly registry: ProjectSummaryRegistry,
  ) {}

  async list(): Promise<InitiativeCard[]> {
    const keys = Object.keys(INITIATIVE_META) as ProjectKey[];
    return Promise.all(keys.map((key) => this.card(key)));
  }

  async card(key: ProjectKey): Promise<InitiativeCard> {
    const meta = INITIATIVE_META[key];
    const leadClubId = await this.content.setting<string | null>(
      `subdomain.${key}.leadClubId`,
      null,
    );
    if (!leadClubId) return { key, ...meta, status: 'unassigned' };
    const provider = this.registry.get(key);
    if (!provider) return { key, ...meta, status: 'unreachable', leadClubId };
    try {
      const summary = await provider();
      return { key, ...meta, status: 'active', leadClubId, summary };
    } catch {
      return { key, ...meta, status: 'unreachable', leadClubId };
    }
  }
}
