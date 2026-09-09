ALTER TABLE `ActivityPlanEntry`
    DROP INDEX `ActivityPlanEntry_programKey_idx`;

ALTER TABLE `ActivityPlanEntry`
    MODIFY COLUMN `programKey` TEXT NULL;
