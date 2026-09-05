export interface Visit {
  id: string;
  scheduledAt: string;
  notes: string | null;
  createdAt: string;
  visitor: { id: number; name: string };
}
