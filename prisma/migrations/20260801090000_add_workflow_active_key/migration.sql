-- Canonical active slot: legacy `default` is the primary `service-main` slot.
ALTER TABLE `Workflow`
  ADD COLUMN `activeKey` VARCHAR(255) NULL;

CREATE TEMPORARY TABLE `_WorkflowActiveWinners` AS
SELECT `id`, `serviceId`, `canonicalType`, `rn`
FROM (
  SELECT
    `id`,
    `serviceId`,
    CASE WHEN `workflowType` = 'default' THEN 'service-main' ELSE `workflowType` END AS `canonicalType`,
    ROW_NUMBER() OVER (
      PARTITION BY `serviceId`, CASE WHEN `workflowType` = 'default' THEN 'service-main' ELSE `workflowType` END
      ORDER BY
        CASE WHEN `workflowType` = 'service-main' THEN 1 ELSE 0 END DESC,
        `version` DESC,
        `updatedAt` DESC,
        `id` DESC
    ) AS `rn`
  FROM `Workflow`
  WHERE `isActive` = 1 OR `status` = 'ACTIVE'
) ranked;

UPDATE `Workflow` workflow
INNER JOIN `_WorkflowActiveWinners` winner ON winner.`id` = workflow.`id`
SET
  workflow.`isActive` = 0,
  workflow.`status` = 'ARCHIVED',
  workflow.`activeKey` = NULL
WHERE winner.`rn` > 1;

UPDATE `Workflow` workflow
INNER JOIN `_WorkflowActiveWinners` winner ON winner.`id` = workflow.`id`
SET
  workflow.`isActive` = 1,
  workflow.`status` = 'ACTIVE',
  workflow.`activeKey` = CONCAT(workflow.`serviceId`, ':', winner.`canonicalType`)
WHERE winner.`rn` = 1;

UPDATE `Workflow`
SET `activeKey` = NULL
WHERE `isActive` = 0;

DROP TEMPORARY TABLE `_WorkflowActiveWinners`;

CREATE UNIQUE INDEX `Workflow_activeKey_key` ON `Workflow`(`activeKey`);
