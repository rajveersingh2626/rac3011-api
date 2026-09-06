export type ScrapedClub = {
  id: string;
  name: string;
  short_name: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  president: string | null;
  is_director: string | null;
  phone: string | null;
  email: string | null;
  rotary_id: string | null;
  secretary: string | null;
  secretary_email: string | null;
  secretary_phone: string | null;
  initiatives: unknown[];
  created_at: string;
  updated_at: string;
};

export type ScrapedDrr = {
  id: string;
  srNo: number;
  year: string;
  tenure: string;
  name: string;
  district: string;
  districtEra: string;
  homeClub: string;
  photo: string | null;
  hasPhoto: boolean;
};

export type ExistingClubRow = {
  id: string;
  name: string;
  shortName: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  president: string | null;
  phone: string | null;
  email: string | null;
  rotaryId: string | null;
  secretary: string | null;
  secretaryEmail: string | null;
  secretaryPhone: string | null;
};

export type StatTile = {
  label: string;
  value: string;
  suffix: string;
  note: string;
  color: string;
};

export type AreaOfFocus = {
  order: number;
  title: string;
  description: string;
};
