CREATE TABLE IF NOT EXISTS `AssessmentInterventionWorkflowTarget` (
  `id` VARCHAR(191) NOT NULL,
  `serviceId` VARCHAR(191) NOT NULL,
  `workflowId` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `AssessmentInterventionWorkflowTarget_workflowId_targetType_key` (`workflowId`, `targetType`)
);

CREATE INDEX `AssessmentInterventionWorkflowTarget_serviceId_idx` ON `AssessmentInterventionWorkflowTarget`(`serviceId`);
CREATE INDEX `AssessmentInterventionWorkflowTarget_workflowId_idx` ON `AssessmentInterventionWorkflowTarget`(`workflowId`);
CREATE INDEX `AssessmentInterventionWorkflowTarget_targetType_idx` ON `AssessmentInterventionWorkflowTarget`(`targetType`);
CREATE INDEX `AssessmentInterventionWorkflowTarget_isEnabled_idx` ON `AssessmentInterventionWorkflowTarget`(`isEnabled`);