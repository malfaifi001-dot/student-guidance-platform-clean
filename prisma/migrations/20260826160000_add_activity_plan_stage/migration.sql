ALTER TABLE `ActivityPlanEntry`
    ADD COLUMN `stage` VARCHAR(191) NOT NULL DEFAULT 'غير محددة';

ALTER TABLE `ActivityPlanEntry`
    DROP INDEX `ActivityPlanEntry_week_slot_key`;

ALTER TABLE `ActivityPlanEntry`
    ADD UNIQUE INDEX `ActivityPlanEntry_school_stage_week_slot_key`(`schoolAccountId`, `stage`, `weekNumber`, `dayOfWeek`, `periodNumber`);

ALTER TABLE `ActivityPlanEntry`
    DROP INDEX `ActivityPlanEntry_schoolAccountId_weekNumber_idx`;

ALTER TABLE `ActivityPlanEntry`
    ADD INDEX `ActivityPlanEntry_schoolAccountId_stage_weekNumber_idx`(`schoolAccountId`, `stage`, `weekNumber`);
