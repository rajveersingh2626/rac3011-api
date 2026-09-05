export type EnquiryRow = {
  id: string;
  kind: 'new_club' | 'sponsor' | 'contact';
  name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  message: string;
  payload: unknown;
  routedTo: string;
  status: string;
  assignedToId: string | null;
  createdAt: Date;
};
