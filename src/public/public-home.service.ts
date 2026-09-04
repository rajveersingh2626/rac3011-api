import { Injectable } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { publicProjectSummaryDto } from '../showcase/showcase.transformer';
import { ShowcaseService } from '../showcase/showcase.service';

type HomeStats = { zones: number; focusAreas: number; foundedYear: number; ageRange: string };
const FALLBACK_STATS: HomeStats = { zones: 4, focusAreas: 7, foundedYear: 1968, ageRange: '18–30' };

@Injectable()
export class PublicHomeService {
  constructor(
    private readonly content: ContentService,
    private readonly showcase: ShowcaseService,
  ) {}

  async build() {
    const [blocks, stats, latest] = await Promise.all([
      this.content.publishedBlocks('home'),
      this.content.setting<HomeStats>('home.stats', FALLBACK_STATS),
      this.showcase.latest(4),
    ]);
    return {
      hero: {
        badge: blocks.hero_badge?.value ?? null,
        title: blocks.hero_title?.value ?? null,
        subtitle: blocks.hero_subtitle?.value ?? null,
        ctaPrimary: blocks.cta_primary?.value ?? null,
        ctaSecondary: blocks.cta_secondary?.value ?? null,
      },
      footerTagline: blocks.footer_tagline?.value ?? null,
      stats,
      flagship: blocks.flagship?.value ?? [],
      latestProjects: latest.map(publicProjectSummaryDto),
    };
  }
}
