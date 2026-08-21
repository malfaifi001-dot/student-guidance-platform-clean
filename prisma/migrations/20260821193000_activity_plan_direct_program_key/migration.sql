ALTER TABLE `ActivityPlanEntry`
    ADD COLUMN `programKey` VARCHAR(191) NULL;

ALTER TABLE `ActivityPlanEntry`
    DROP FOREIGN KEY `ActivityPlanEntry_programCaseEntryId_fkey`;

ALTER TABLE `ActivityPlanEntry`
    MODIFY `programCaseEntryId` VARCHAR(191) NULL;

ALTER TABLE `ActivityPlanEntry`
    ADD INDEX `ActivityPlanEntry_programKey_idx`(`programKey`);

UPDATE `ActivityPlanEntry` AS plan
INNER JOIN `CaseEntry` AS activity ON activity.`id` = plan.`programCaseEntryId`
INNER JOIN `Service` AS service ON service.`id` = activity.`serviceId`
SET plan.`programKey` = CASE service.`slug`
    WHEN 'activity-programs-citizenship-life' THEN 'citizenship-life'
    WHEN 'activity-programs-science-technology' THEN 'science-technology'
    WHEN 'activity-programs-culture-arts' THEN 'culture-arts'
    WHEN 'activity-programs-sports-health' THEN 'sports-health'
    WHEN 'activity-programs-scouting' THEN 'scouting'
    WHEN 'activity-programs-events-occasions' THEN 'events-occasions'
    ELSE plan.`programKey`
END
WHERE plan.`programKey` IS NULL;

ALTER TABLE `ActivityPlanEntry`
    ADD CONSTRAINT `ActivityPlanEntry_programCaseEntryId_fkey`
    FOREIGN KEY (`programCaseEntryId`) REFERENCES `CaseEntry`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
