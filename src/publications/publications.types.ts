export type PublicationRow = {
  id: string;
  title: string;
  type: 'directory' | 'newsletter';
  url: string;
  month: Date;
  coverUrl: string | null;
};
