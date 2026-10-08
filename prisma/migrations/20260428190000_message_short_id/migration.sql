-- Add the public message identifier used by message and author URLs.
ALTER TABLE "Message"
ADD COLUMN IF NOT EXISTS "shortId" VARCHAR(14);

-- Existing databases may already contain messages when this migration runs.
-- A deterministic backfill keeps those rows addressable without exposing UUIDs.
UPDATE "Message"
SET "shortId" = SUBSTRING(md5("id"::text) FROM 1 FOR 14)
WHERE "shortId" IS NULL;

ALTER TABLE "Message"
ALTER COLUMN "shortId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Message_shortId_key"
ON "Message"("shortId");
