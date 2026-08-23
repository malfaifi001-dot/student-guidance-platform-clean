ALTER TABLE `ServiceOutputLink`
    ADD COLUMN `targetSectionKey` VARCHAR(180) NULL;

CREATE INDEX `ServiceOutputLink_owner_section_idx`
    ON `ServiceOutputLink`(`ownerUserId`, `roleKey`, `targetSectionKey`);
