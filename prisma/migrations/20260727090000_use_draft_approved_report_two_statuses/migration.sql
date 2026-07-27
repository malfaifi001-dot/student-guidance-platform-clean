-- Expand the enum temporarily so existing rows can be translated safely.
ALTER TABLE `ReportTwoActive`
  MODIFY `status` ENUM('SAVED', 'DRAFT', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT';

UPDATE `ReportTwoActive`
SET `status` = 'DRAFT'
WHERE `status` = 'SAVED';

UPDATE `ReportTwoActive`
SET `status` = CASE
  WHEN `approvedAt` IS NULL THEN 'DRAFT'
  ELSE 'APPROVED'
END
WHERE `status` = 'ARCHIVED';

-- Final product states: draft or approved only.
ALTER TABLE `ReportTwoActive`
  MODIFY `status` ENUM('DRAFT', 'APPROVED') NOT NULL DEFAULT 'DRAFT';
