-- CreateTable
CREATE TABLE "trainers" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trainers_org_id_idx" ON "trainers"("org_id");

-- CreateIndex
CREATE INDEX "trainers_is_active_idx" ON "trainers"("is_active");

-- AddForeignKey
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate existing trainer_name data: create a trainer row for each distinct (org_id, trainer_name) pair
INSERT INTO "trainers" ("id", "org_id", "name", "updated_at")
SELECT gen_random_uuid(), org_id, trainer_name, NOW()
FROM (SELECT DISTINCT org_id, trainer_name FROM "trainings") AS distinct_trainers;

-- Add trainer_id column as nullable first
ALTER TABLE "trainings" ADD COLUMN "trainer_id" TEXT;

-- Populate trainer_id from the newly created trainers rows
UPDATE "trainings" t
SET "trainer_id" = tr."id"
FROM "trainers" tr
WHERE tr."org_id" = t."org_id" AND tr."name" = t."trainer_name";

-- Make trainer_id NOT NULL now that all rows are populated
ALTER TABLE "trainings" ALTER COLUMN "trainer_id" SET NOT NULL;

-- Drop the old trainer_name column
ALTER TABLE "trainings" DROP COLUMN "trainer_name";

-- CreateIndex
CREATE INDEX "trainings_trainer_id_idx" ON "trainings"("trainer_id");

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
