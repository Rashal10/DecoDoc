CREATE TABLE IF NOT EXISTS "papers" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "authors" jsonb NOT NULL,
  "abstract" text NOT NULL,
  "year" integer,
  "venue" text,
  "arxiv_id" text,
  "doi" text,
  "url" text,
  "citation_count" integer DEFAULT 0 NOT NULL,
  "embedding" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "papers_arxiv_id_unique" UNIQUE("arxiv_id"),
  CONSTRAINT "papers_doi_unique" UNIQUE("doi")
);

CREATE TABLE IF NOT EXISTS "analyses" (
  "paper_id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "analyses_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "auth_provider_id" text NOT NULL,
  "email" text,
  "display_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_auth_provider_id_unique" UNIQUE("auth_provider_id")
);

CREATE TABLE IF NOT EXISTS "anonymous_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "analysis_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "analysis_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "session_id" uuid,
  "paper_id" text,
  "was_cache_hit" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "analysis_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
  CONSTRAINT "analysis_usage_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "anonymous_sessions"("id"),
  CONSTRAINT "analysis_usage_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "papers"("id")
);

CREATE TABLE IF NOT EXISTS "user_bookmarks" (
  "user_id" uuid NOT NULL,
  "paper_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_bookmarks_user_id_paper_id_pk" PRIMARY KEY("user_id","paper_id"),
  CONSTRAINT "user_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "user_bookmarks_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE cascade
);
