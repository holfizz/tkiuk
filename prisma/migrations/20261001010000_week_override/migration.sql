-- Legacy settings were overwritten on every public GET; they are not manual anchors.
ALTER TABLE "WeekSettings" ADD COLUMN "manualOverride" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Replacement_campus_date_idx" ON "Replacement"("campus", "date");
