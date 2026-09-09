ALTER TABLE `ActivityPlanEntry`
    DROP INDEX `ActivityPlanEntry_school_stage_week_slot_key`;

ALTER TABLE `ActivityPlanEntry`
    ADD INDEX `ActivityPlanEntry_school_stage_week_slot_idx`(`schoolAccountId`, `stage`, `weekNumber`, `dayOfWeek`, `periodNumber`);
