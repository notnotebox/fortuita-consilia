CREATE TABLE "WriteRun" (
    "runId" UUID NOT NULL,
    "publicSeed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxOps" INTEGER NOT NULL,
    "maxConsumed" INTEGER NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "committed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WriteRun_pkey" PRIMARY KEY ("runId")
);

CREATE INDEX "WriteRun_expiresAt_idx" ON "WriteRun"("expiresAt");

ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
