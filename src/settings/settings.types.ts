import { z } from 'zod';
import { PROJECT_KEYS } from '../public/project-summary.registry';

const timeOfDay = z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const FIXED_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'report.deadlineDay': z.number().int().min(1).max(28),
  'compliance.thresholdMonths': z.number().int().min(1).max(12),
  'feedback.allowAnonymous': z.boolean(),
  'drr.workingDays': z.array(z.number().int().min(0).max(6)),
  'drr.dayStart': timeOfDay,
  'drr.dayEnd': timeOfDay,
  'drr.slotMinutes': z.number().int().min(15).max(240),
  'drr.bufferMinutes': z.number().int().min(0).max(120),
  'drr.monthsAhead': z.number().int().min(1).max(24),
  'drr.blackoutDates': z.array(isoDate),
  enquiry_routing: z.object({
    new_club: z.object({ name: z.string(), email: z.string() }),
    sponsor: z.object({ name: z.string(), email: z.string() }),
    contact: z.object({ name: z.string(), email: z.string() }),
  }),
  'rcl.pointsWin': z.number().int().min(0),
  'rcl.pointsTie': z.number().int().min(0),
  'rcl.season': z.number().int().min(2000).max(2100),
  'careerbridge.expiryDays': z.number().int().min(1).max(365),
  'home.stats': z.object({
    zones: z.number().int().min(0),
    focusAreas: z.number().int().min(0),
    foundedYear: z.number().int().min(1900).max(2100),
    ageRange: z.string(),
  }),
  'sponsor.ratios': z.object({
    perRupee: z.number().min(0),
    mealsPerThousand: z.number().min(0),
    kitsPerThousand: z.number().min(0),
    unitsPerThousand: z.number().min(0),
  }),
};

const SUBDOMAIN_ACTIVE = /^subdomain\.(.+)\.active$/;
const SUBDOMAIN_LEAD_CLUB = /^subdomain\.(.+)\.leadClubId$/;

export function schemaForKey(key: string): z.ZodTypeAny | undefined {
  if (FIXED_SCHEMAS[key]) return FIXED_SCHEMAS[key];
  const activeMatch = SUBDOMAIN_ACTIVE.exec(key);
  if (activeMatch && (PROJECT_KEYS as string[]).includes(activeMatch[1])) return z.boolean();
  const leadMatch = SUBDOMAIN_LEAD_CLUB.exec(key);
  if (leadMatch && (PROJECT_KEYS as string[]).includes(leadMatch[1])) {
    return z.string().min(1).nullable();
  }
  return undefined;
}

export function subdomainKeyFromLeadClubSetting(key: string): string | undefined {
  const match = SUBDOMAIN_LEAD_CLUB.exec(key);
  return match ? match[1] : undefined;
}
