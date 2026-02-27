-- CreateEnum
CREATE TYPE "PlanCategory" AS ENUM ('membership', 'training');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('active', 'expired', 'cancelled', 'frozen');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "training_id" TEXT;

-- AlterTable
ALTER TABLE "plan_types" ADD COLUMN     "category" "PlanCategory" NOT NULL DEFAULT 'membership';

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_variant_id" TEXT NOT NULL,
    "trainer_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'active',
    "price_at_purchase" DOUBLE PRECISION NOT NULL,
    "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "final_price" DOUBLE PRECISION NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trainings_member_id_idx" ON "trainings"("member_id");

-- CreateIndex
CREATE INDEX "trainings_status_idx" ON "trainings"("status");

-- CreateIndex
CREATE INDEX "trainings_end_date_idx" ON "trainings"("end_date");

-- CreateIndex
CREATE INDEX "payments_training_id_idx" ON "payments"("training_id");

-- CreateIndex
CREATE INDEX "plan_types_category_idx" ON "plan_types"("category");

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_plan_variant_id_fkey" FOREIGN KEY ("plan_variant_id") REFERENCES "plan_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "trainings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
