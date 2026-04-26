CREATE TABLE "DailyUptime" (
  "id" UUID NOT NULL,
  "day" DATE NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'server',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyUptime_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyUptime_day_key" ON "DailyUptime"("day");
