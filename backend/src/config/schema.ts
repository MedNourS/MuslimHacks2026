import { integer, uuid, pgTable, pgEnum, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const accountType = pgEnum("account_type", ["family", "volunteer"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  password: text("password").notNull(),
  accountType: accountType("account_type").notNull().default("family"),
  // Volunteers only — a coarse area they're willing to help in, e.g. "Verdun, Montreal".
  preferredArea: text("preferred_area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const elders = pgTable("elders", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  primaryContactId: integer("primary_contact_id")
    .notNull()
    .references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  // Coarse area shown on open postings so volunteers can browse by neighborhood — never a
  // precise address. Deliberately just a name, not coordinates: we don't geocode anything, so
  // there's no precise point to fuzz in the first place.
  area: text("area").notNull().default("Not specified"),
  // The real address, if the family adds one. Only ever returned to circle members (family, the
  // elder, or a volunteer with a confirmed visit) — see elders.services.ts — never to anyone
  // browsing open postings.
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberRole = pgEnum("member_role", ["family", "other", "elder", "volunteer"]);

export const careCircleMembers = pgTable(
  "care_circle_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    elderId: uuid("elder_id")
      .notNull()
      .references(() => elders.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("family"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueMembership: unique().on(t.elderId, t.userId),
  })
);

export const timelinePosts = pgTable("timeline_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  elderId: uuid("elder_id")
    .notNull()
    .references(() => elders.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// open: posted, no volunteer yet (a "posting" in the marketplace sense)
// pending_family_confirm: a volunteer claimed it; the family/elder needs to confirm
// confirmed: matched — the volunteer gets circle access for this elder until the visit closes out
// cancelled / completed: closed out either way, no active claim
export const visitStatus = pgEnum("visit_status", [
  "open",
  "pending_family_confirm",
  "confirmed",
  "cancelled",
  "completed",
]);

export const visits = pgTable("visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  elderId: uuid("elder_id")
    .notNull()
    .references(() => elders.id, { onDelete: "cascade" }),
  // Who posted the request — set for marketplace-style postings. Null on older, pre-marketplace
  // rows where the visitor scheduled their own visit directly.
  postedById: integer("posted_by_id").references(() => users.id, { onDelete: "set null" }),
  // The person doing the visit — null while a posting is still open and unclaimed.
  visitorId: integer("visitor_id").references(() => users.id, { onDelete: "set null" }),
  status: visitStatus("status").notNull().default("confirmed"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  notes: text("notes"),
  checkInAt: timestamp("check_in_at"),
  checkInLat: text("check_in_lat"),
  checkInLng: text("check_in_lng"),
  checkOutAt: timestamp("check_out_at"),
  checkOutLat: text("check_out_lat"),
  checkOutLng: text("check_out_lng"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
