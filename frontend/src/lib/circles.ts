export type CircleRole = "family" | "home_aide" | "other" | "elder";

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
  members: CircleMember[];
}
