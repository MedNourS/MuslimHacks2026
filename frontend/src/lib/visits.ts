export type VisitStatus = "open" | "pending_family_confirm" | "confirmed" | "cancelled" | "completed";

export interface Visit {
  id: string;
  elderId: string;
  status: VisitStatus;
  scheduledAt: string;
  notes: string | null;
  createdAt: string;
  postedBy: { id: number; name: string } | null;
  visitor: { id: number; name: string } | null;
  checkInAt: string | null;
  checkOutAt: string | null;
}
