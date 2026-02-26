-- CreateTable
CREATE TABLE "Schedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "course" INTEGER NOT NULL,
    "group" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Schedule_course_group_idx" ON "Schedule"("course", "group");

-- CreateIndex
CREATE INDEX "Schedule_teacher_idx" ON "Schedule"("teacher");
