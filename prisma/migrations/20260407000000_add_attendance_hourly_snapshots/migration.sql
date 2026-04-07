-- CreateTable
CREATE TABLE "attendance_hourly_snapshots" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attendance_hourly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_hourly_snapshots_org_id_date_hour_key" ON "attendance_hourly_snapshots"("org_id", "date", "hour");

-- CreateIndex
CREATE INDEX "attendance_hourly_snapshots_org_id_idx" ON "attendance_hourly_snapshots"("org_id");

-- AddForeignKey
ALTER TABLE "attendance_hourly_snapshots" ADD CONSTRAINT "attendance_hourly_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
