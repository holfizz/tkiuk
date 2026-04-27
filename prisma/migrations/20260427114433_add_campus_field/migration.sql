-- CreateEnum
CREATE TYPE "Campus" AS ENUM ('MAIN', 'SECONDARY');

-- DropIndex
DROP INDEX "Schedule_course_groupFull_dayOfWeek_timeSlot_key";

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "campus" "Campus" NOT NULL DEFAULT 'MAIN';

-- CreateTable
CREATE TABLE "Replacement" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "course" INTEGER NOT NULL,
    "groupFull" TEXT NOT NULL,
    "pairNumber" INTEGER NOT NULL,
    "originalSubject" TEXT,
    "newSubject" TEXT NOT NULL,
    "originalTeacher" TEXT,
    "newTeacher" TEXT NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Replacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekSettings" (
    "id" SERIAL NOT NULL,
    "currentWeekType" TEXT NOT NULL DEFAULT 'numerator',
    "startDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Replacement_date_idx" ON "Replacement"("date");

-- CreateIndex
CREATE INDEX "Replacement_groupFull_idx" ON "Replacement"("groupFull");

-- CreateIndex
CREATE INDEX "Replacement_course_idx" ON "Replacement"("course");

-- CreateIndex
CREATE UNIQUE INDEX "Replacement_date_groupFull_pairNumber_key" ON "Replacement"("date", "groupFull", "pairNumber");

-- CreateIndex
CREATE INDEX "Schedule_weekType_idx" ON "Schedule"("weekType");

-- CreateIndex
CREATE INDEX "Schedule_campus_idx" ON "Schedule"("campus");

-- CreateIndex
CREATE INDEX "Schedule_course_groupFull_dayOfWeek_timeSlot_weekType_idx" ON "Schedule"("course", "groupFull", "dayOfWeek", "timeSlot", "weekType");
