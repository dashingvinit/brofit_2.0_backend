-- AddIndex: composite index to speed up findOpenRecord (check-in hot path)
CREATE INDEX "attendances_org_id_member_id_exit_time_idx" ON "attendances"("org_id", "member_id", "exit_time");
