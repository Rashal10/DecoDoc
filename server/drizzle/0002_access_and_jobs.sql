ALTER TABLE "papers" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public' NOT NULL;
ALTER TABLE "papers" ADD COLUMN IF NOT EXISTS "owner_user_id" uuid;
ALTER TABLE "papers" ADD COLUMN IF NOT EXISTS "owner_session_id" uuid;

DO $$ BEGIN
  ALTER TABLE "papers" ADD CONSTRAINT "papers_visibility_check" CHECK ("visibility" IN ('public', 'private'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "papers" ADD CONSTRAINT "papers_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "papers" ADD CONSTRAINT "papers_owner_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("owner_session_id") REFERENCES "anonymous_sessions"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "papers_visibility_idx" ON "papers" ("visibility");

ALTER TABLE "analyses" ADD COLUMN IF NOT EXISTS "citations_fetched_at" timestamp with time zone;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_unique" ON "users" ("google_sub");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique" ON "users" (lower("email")) WHERE "email" IS NOT NULL;

ALTER TABLE "analysis_usage" DROP CONSTRAINT IF EXISTS "analysis_usage_session_id_anonymous_sessions_id_fk";
ALTER TABLE "analysis_usage" ADD CONSTRAINT "analysis_usage_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "anonymous_sessions"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "analysis_usage_user_created_idx" ON "analysis_usage" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "analysis_usage_session_created_idx" ON "analysis_usage" ("session_id", "created_at");

CREATE TABLE IF NOT EXISTS "analysis_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "paper_id" text NOT NULL,
  "status" text NOT NULL,
  "error" text,
  "owner_user_id" uuid,
  "owner_session_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "analysis_jobs_status_check" CHECK ("status" IN ('queued', 'running', 'done', 'failed')),
  CONSTRAINT "analysis_jobs_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE,
  CONSTRAINT "analysis_jobs_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "analysis_jobs_owner_session_id_anonymous_sessions_id_fk" FOREIGN KEY ("owner_session_id") REFERENCES "anonymous_sessions"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "analysis_jobs_one_active_per_paper" ON "analysis_jobs" ("paper_id") WHERE "status" IN ('queued', 'running');
CREATE INDEX IF NOT EXISTS "analysis_jobs_created_idx" ON "analysis_jobs" ("created_at");
