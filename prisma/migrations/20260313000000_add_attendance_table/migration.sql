-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL,
    "exit_time" TIMESTAMP(3),
    "date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_org_id_idx" ON "attendances"("org_id");

-- CreateIndex
CREATE INDEX "attendances_member_id_idx" ON "attendances"("member_id");

-- CreateIndex
CREATE INDEX "attendances_date_idx" ON "attendances"("date");

-- CreateIndex
CREATE INDEX "attendances_org_id_date_idx" ON "attendances"("org_id", "date");

-- CreateIndex
CREATE INDEX "attendances_org_id_exit_time_idx" ON "attendances"("org_id", "exit_time");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
