-- AlterTable
ALTER TABLE "memberships" ADD COLUMN "freeze_reason" TEXT,
ADD COLUMN "freeze_start_date" TIMESTAMP(3),
ADD COLUMN "freeze_end_date" TIMESTAMP(3);
