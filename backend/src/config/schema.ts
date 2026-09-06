import { boolean, integer, uuid, pgTable, pgEnum, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  password: text("password").notNull(),
  // Opt-in, independent of having your own circle(s): anyone can coordinate care for their
  // own family AND volunteer for others at the same time.
  wantsToVolunteer: boolean("wants_to_volunteer").notNull().default(false),
  // Set only while wantsToVolunteer is true: a coarse area they're willing to help in, e.g.
  // "Verdun, Montreal".
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
  // Coarse area shown on open postings so volunteers can browse by neighborhood, never a
  // precise address. Deliberately just a name, not coordinates: we don't geocode anything, so
  // there's no precise point to fuzz in the first place.
  area: text("area").notNull().default("Not specified"),
  // The real address, if the family adds one. Only ever returned to circle members (family, the
  // elder, or a volunteer with a confirmed visit), see elders.services.ts, never to anyone
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
// confirmed: matched, the volunteer gets circle access for this elder until the visit closes out
// cancelled / completed: closed out either way, no active claim
export const visitStatus = pgEnum("visit_status", [
  "open",
  "pending_family_confirm",
  "confirmed",
  "cancelled",
  "completed",
]);

export const medicationSchedules = pgTable("medication_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  elderId: uuid("elder_id")
    .notNull()
    .references(() => elders.id, { onDelete: "cascade" }),
  // What it is, in the family's own words ("Blood pressure pill", "Insulin"), not a drug
  // database lookup, just a label.
  label: text("label").notNull(),
  // 24-hour "HH:MM", local to the elder: there's no per-elder timezone in this schema (single
  // deployment, one region), so this is displayed as-entered rather than converted.
  timeOfDay: text("time_of_day").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // The raw token only ever lives in the emailed link: this stores a sha256 hash of it, the
  // same "never store the secret itself" shape as the password column above.
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visits = pgTable("visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  elderId: uuid("elder_id")
    .notNull()
    .references(() => elders.id, { onDelete: "cascade" }),
  // Who posted the request: set for marketplace-style postings. Null on older, pre-marketplace
  // rows where the visitor scheduled their own visit directly.
  postedById: integer("posted_by_id").references(() => users.id, { onDelete: "set null" }),
  // The person doing the visit: null while a posting is still open and unclaimed.
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
