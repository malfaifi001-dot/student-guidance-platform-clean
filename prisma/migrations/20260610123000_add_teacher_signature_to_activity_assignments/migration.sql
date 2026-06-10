ALTER TABLE `ActivityAssignment`
  ADD COLUMN `teacherSignatureUrl` VARCHAR(191) NULL,
  ADD COLUMN `teacherSignedName` VARCHAR(191) NULL,
  ADD COLUMN `teacherSignedAt` DATETIME(3) NULL;