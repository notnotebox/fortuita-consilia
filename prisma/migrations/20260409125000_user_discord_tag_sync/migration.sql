-- Add Discord tag snapshot to user profile so we can track profile changes over time.
ALTER TABLE "User"
ADD COLUMN "discordTag" TEXT;

