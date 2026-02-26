/*
  Warnings:

  - Added the required column `updatedAt` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Schedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "course" INTEGER NOT NULL,
    "group" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT NOT NULL,
    "room" TEXT,
    "weekType" TEXT NOT NULL DEFAULT 'both',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Schedule" ("course", "createdAt", "dayOfWeek", "group", "id", "room", "specialty", "subject", "teacher", "timeSlot") SELECT "course", "createdAt", "dayOfWeek", "group", "id", "room", "specialty", "subject", "teacher", "timeSlot" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
CREATE INDEX "Schedule_course_group_idx" ON "Schedule"("course", "group");
CREATE INDEX "Schedule_teacher_idx" ON "Schedule"("teacher");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
