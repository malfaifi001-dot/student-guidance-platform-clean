ALTER TABLE `CurriculumStage`
  ADD COLUMN `parentId` VARCHAR(191) NULL,
  ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0,
  ADD INDEX `CurriculumStage_parentId_sortOrder_idx` (`parentId`, `sortOrder`),
  ADD CONSTRAINT `CurriculumStage_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `CurriculumStage` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `CurriculumStage` AS child
JOIN `CurriculumStage` AS parent
  ON parent.`name` = 'التربية الخاصة'
SET child.`parentId` = parent.`id`
WHERE child.`name` IN ('المرحلة الابتدائية', 'المرحلة المتوسطة', 'المرحلة التأهيلية', 'دليل المعلم المرجعي لمناهج التربية الخاصة')
  AND child.`sourceKey` LIKE '%specialEducation%'
  AND child.`id` <> parent.`id`;

UPDATE `CurriculumStage` SET `sortOrder` = CASE
  WHEN `name` = 'المرحلة الابتدائية' AND `parentId` IS NULL THEN 10
  WHEN `name` = 'المرحلة المتوسطة' AND `parentId` IS NULL THEN 20
  WHEN `name` = 'الثانوية العامة' AND `parentId` IS NULL THEN 30
  WHEN `name` = 'التعليم المستمر' AND `parentId` IS NULL THEN 40
  WHEN `name` = 'التربية الخاصة' AND `parentId` IS NULL THEN 50
  WHEN `name` = 'المرحلة الابتدائية' THEN 10
  WHEN `name` = 'المرحلة المتوسطة' THEN 20
  WHEN `name` = 'المرحلة التأهيلية' THEN 30
  WHEN `name` = 'دليل المعلم المرجعي لمناهج التربية الخاصة' THEN 40
  ELSE `sortOrder`
END;
