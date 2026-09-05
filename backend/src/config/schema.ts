import { integer, uuid, pgTable, pgEnum, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const elders = pgTable("elders", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  primaryContactId: integer("primary_contact_id")
    .notNull()
    .references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberRole = pgEnum("member_role", ["family", "home_aide", "other", "elder"]);

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

export const visits = pgTable("visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  elderId: uuid("elder_id")
    .notNull()
    .references(() => elders.id, { onDelete: "cascade" }),
  visitorId: integer("visitor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
