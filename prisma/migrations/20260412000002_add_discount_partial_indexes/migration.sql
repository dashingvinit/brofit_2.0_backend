-- Partial indexes: only rows where a discount was actually applied.
-- Keeps the index small (bounded by discounted rows, not total rows),
-- so discount analytics scale linearly with discount volume per org.

CREATE INDEX IF NOT EXISTS "memberships_org_startdate_discount_idx"
  ON "memberships" ("org_id", "start_date")
  WHERE "discount_amount" > 0;

CREATE INDEX IF NOT EXISTS "trainings_org_startdate_discount_idx"
  ON "trainings" ("org_id", "start_date")
  WHERE "discount_amount" > 0;
