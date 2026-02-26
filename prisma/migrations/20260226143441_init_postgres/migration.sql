-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "course" INTEGER NOT NULL,
    "group" TEXT NOT NULL,
    "groupFull" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT NOT NULL,
    "room" TEXT,
    "weekType" TEXT NOT NULL DEFAULT 'both',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Schedule_course_group_idx" ON "Schedule"("course", "group");

-- CreateIndex
CREATE INDEX "Schedule_teacher_idx" ON "Schedule"("teacher");

-- CreateIndex
CREATE INDEX "Schedule_groupFull_idx" ON "Schedule"("groupFull");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_course_groupFull_dayOfWeek_timeSlot_key" ON "Schedule"("course", "groupFull", "dayOfWeek", "timeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_name_key" ON "Teacher"("name");
