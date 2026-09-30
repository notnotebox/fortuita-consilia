CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "messageId" UUID,
    "messagePublicId" VARCHAR(14) NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorTag" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_messagePublicId_idx" ON "Report"("messagePublicId");

ALTER TABLE "Report"
ADD CONSTRAINT "Report_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
