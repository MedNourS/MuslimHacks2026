export type CircleRole = "family" | "other" | "elder" | "volunteer";

export interface Circle {
  id: string;
  fullName: string;
  inviteCode: string;
  role: CircleRole;
}

export interface CircleMember {
  userId: number;
  name: string;
  email: string;
  role: CircleRole;
}

export interface CircleDetail extends Circle {
  area: string;
  address: string | null;
  members: CircleMember[];
}
