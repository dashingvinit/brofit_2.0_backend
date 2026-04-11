-- AlterTable: Add trainer payout defaults to plan_variants
ALTER TABLE "plan_variants" ADD COLUMN "default_trainer_split_percent" DOUBLE PRECISION;
ALTER TABLE "plan_variants" ADD COLUMN "default_trainer_fixed_payout" DOUBLE PRECISION;

-- AlterTable: Add package configuration fields to offers
ALTER TABLE "offers" ADD COLUMN "target_gender" TEXT;
ALTER TABLE "offers" ADD COLUMN "membership_plan_variant_id" TEXT;
ALTER TABLE "offers" ADD COLUMN "training_plan_variant_id" TEXT;
ALTER TABLE "offers" ADD COLUMN "target_price" DOUBLE PRECISION;
ALTER TABLE "offers" ADD COLUMN "trainer_fixed_payout" DOUBLE PRECISION;
ALTER TABLE "offers" ADD COLUMN "trainer_split_percent" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_membership_plan_variant_id_fkey" FOREIGN KEY ("membership_plan_variant_id") REFERENCES "plan_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_training_plan_variant_id_fkey" FOREIGN KEY ("training_plan_variant_id") REFERENCES "plan_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
