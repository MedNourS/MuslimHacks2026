import type { VisitStatus } from "./visits";

// A posting as a volunteer browsing /visits/open sees it — area only, never an address.
export interface OpenPosting {
  id: string;
  elderId: string;
  elderFirstName: string;
  area: string;
  scheduledAt: string;
  notes: string | null;
  postedAt: string;
  // True when this posting's area matches the volunteer's own preferred area. The list is
  // already sorted with matches first — this is what lets the UI label why.
  matchesArea: boolean;
}

// A posting as the volunteer who claimed it sees it — address appears once confirmed.
export interface MyClaim {
  id: string;
  elderId: string;
  elderFullName: string;
  area: string;
  address: string | null;
  status: VisitStatus;
  scheduledAt: string;
  notes: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
}
