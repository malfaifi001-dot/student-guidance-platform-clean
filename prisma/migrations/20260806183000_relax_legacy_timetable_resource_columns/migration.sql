-- The current timetable workspace stores the grade in TimetableClass.name and
-- weekly lesson counts in TimetableClassSubject. These legacy columns remain
-- for backwards compatibility, but must not block inserts from the current API.
ALTER TABLE `TimetableClass`
  MODIFY `stage` VARCHAR(191) NULL,
  MODIFY `grade` VARCHAR(191) NULL;

ALTER TABLE `TimetableSubject`
  MODIFY `weeklyPeriods` INTEGER NULL;
