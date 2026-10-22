CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "papers" ADD COLUMN IF NOT EXISTS "embedding_vec" vector(3072);
--> statement-breakpoint
UPDATE "papers"
SET "embedding_vec" = "embedding"::text::vector
WHERE "visibility" = 'public'
  AND "embedding" IS NOT NULL
  AND jsonb_typeof("embedding") = 'array'
  AND jsonb_array_length("embedding") = 3072
  AND "embedding_vec" IS NULL;
