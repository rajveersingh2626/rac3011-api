export type GalleryItemRow = {
  id: string;
  title: string;
  eventName: string | null;
  category: string;
  imageUrl: string;
  caption: string | null;
  date: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

