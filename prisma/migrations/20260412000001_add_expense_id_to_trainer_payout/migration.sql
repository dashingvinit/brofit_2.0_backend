-- Add nullable expenseId to trainer_payouts to link with the auto-created expense
ALTER TABLE "trainer_payouts" ADD COLUMN "expense_id" TEXT;

ALTER TABLE "trainer_payouts"
  ADD CONSTRAINT "trainer_payouts_expense_id_fkey"
  FOREIGN KEY ("expense_id") REFERENCES "expenses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "trainer_payouts_expense_id_idx" ON "trainer_payouts"("expense_id");
