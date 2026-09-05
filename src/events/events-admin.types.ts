import type { ProjectKey } from '../common/types/access';

export type RsvpStatus = 'going' | 'maybe' | 'not_going';
export type CheckinMethod = 'qr' | 'manual' | 'walk_in';

export type EventRow = {
  id: string;
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string | null;
  coverUrl: string | null;
  isDistrictEvent: boolean;
  clubId: string | null;
  projectKey: ProjectKey | null;
  rsvpOpen: boolean;
  capacity: number | null;
  photos: string[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EventListFilter = {
  from?: Date;
  to?: Date;
  clubId?: string;
  isDistrictEvent?: boolean;
  projectKey?: string;
};

export type EventCreateInput = {
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string | null;
  coverUrl: string | null;
  isDistrictEvent: boolean;
  clubId: string | null;
  projectKey: ProjectKey | null;
  rsvpOpen: boolean;
  capacity: number | null;
  photos: string[];
  createdById: string;
};

export type EventUpdateInput = Partial<
  Omit<EventCreateInput, 'createdById' | 'slug'> & { slug: string }
>;

export type RsvpRow = {
  eventId: string;
  memberId: string;
  status: RsvpStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CheckinRow = {
  id: string;
  eventId: string;
  memberId: string | null;
  walkInName: string | null;
  clubId: string;
  method: CheckinMethod;
  checkedInAt: Date;
  checkedInById: string;
};

export type ClubAttendanceCount = { clubId: string; clubName: string; count: number };
