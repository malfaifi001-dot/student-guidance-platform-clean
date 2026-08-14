ALTER TABLE `ReportSignatureRequest`
  MODIFY `reportId` VARCHAR(191) NULL,
  ADD COLUMN `reportTwoActiveId` VARCHAR(191) NULL;

CREATE INDEX `ReportSignatureRequest_reportTwoActiveId_status_idx`
  ON `ReportSignatureRequest`(`reportTwoActiveId`, `status`);

ALTER TABLE `ReportSignatureRequest`
  ADD CONSTRAINT `ReportSignatureRequest_reportTwoActiveId_fkey`
  FOREIGN KEY (`reportTwoActiveId`) REFERENCES `ReportTwoActive`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
