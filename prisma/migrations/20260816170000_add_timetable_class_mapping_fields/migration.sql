-- TimetableClass.stage and grade existed in the legacy timetable schema.
-- Keep this migration safe for databases where those columns already exist.
ALTER TABLE `TimetableClass`
  ADD COLUMN IF NOT EXISTS `stage` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `grade` VARCHAR(191) NULL;

CREATE INDEX IF NOT EXISTS `TimetableClass_stage_idx`
  ON `TimetableClass`(`stage`);

CREATE INDEX IF NOT EXISTS `TimetableClass_grade_idx`
  ON `TimetableClass`(`grade`);
