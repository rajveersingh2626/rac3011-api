export type PublicEventRow = {
  id: string;
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string | null;
  coverUrl: string | null;
  rsvpOpen: boolean;
  capacity: number | null;
};
