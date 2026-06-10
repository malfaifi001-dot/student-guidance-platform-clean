ALTER TABLE `GuidanceReport`
  MODIFY COLUMN `editableContent` LONGTEXT NOT NULL,
  MODIFY COLUMN `renderedContent` LONGTEXT NULL;