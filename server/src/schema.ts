import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const papers = pgTable("papers", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  authors: jsonb("authors").notNull().$type<string[]>(),
  abstract: text("abstract").notNull(),
  year: integer("year"),
  venue: text("venue"),
  arxivId: text("arxiv_id").unique(),
  doi: text("doi").unique(),
  url: text("url"),
  citationCount: integer("citation_count").default(0).notNull(),
  embedding: jsonb("embedding").$type<number[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const analyses = pgTable("analyses", {
  paperId: text("paper_id")
    .primaryKey()
    .references(() => papers.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authProviderId: text("auth_provider_id").notNull().unique(),
  email: text("email"),
  displayName: text("display_name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const anonymousSessions = pgTable("anonymous_sessions", {
  id: uuid("id").primaryKey(),
  analysisCount: integer("analysis_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const analysisUsage = pgTable("analysis_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  sessionId: uuid("session_id").references(() => anonymousSessions.id),
  paperId: text("paper_id").references(() => papers.id),
  wasCacheHit: boolean("was_cache_hit").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userBookmarks = pgTable(
  "user_bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paperId: text("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.paperId] })]
);
