ALTER TABLE `ActivityAssignment`
  ADD COLUMN `submittedValues` JSON NULL,
  ADD COLUMN `submittedEvidenceItems` JSON NULL,
  ADD COLUMN `returnedReason` TEXT NULL;