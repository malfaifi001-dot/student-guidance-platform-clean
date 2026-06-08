CREATE TABLE IF NOT EXISTS `AssessmentInterventionRule` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `sourceType` VARCHAR(191) NOT NULL DEFAULT 'ASSESSMENT_RISK_STUDENT',
  `interventionType` VARCHAR(191) NOT NULL DEFAULT 'ACADEMIC_RISK',
  `targetServiceId` VARCHAR(191) NOT NULL,
  `targetWorkflowId` VARCHAR(191) NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `conditionJson` JSON NULL,
  `fieldMappingJson` JSON NULL,
  `createdByUserId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
);

CREATE INDEX `AssessmentInterventionRule_schoolAccountId_idx` ON `AssessmentInterventionRule`(`schoolAccountId`);
CREATE INDEX `AssessmentInterventionRule_sourceType_idx` ON `AssessmentInterventionRule`(`sourceType`);
CREATE INDEX `AssessmentInterventionRule_interventionType_idx` ON `AssessmentInterventionRule`(`interventionType`);
CREATE INDEX `AssessmentInterventionRule_targetServiceId_idx` ON `AssessmentInterventionRule`(`targetServiceId`);
CREATE INDEX `AssessmentInterventionRule_targetWorkflowId_idx` ON `AssessmentInterventionRule`(`targetWorkflowId`);
CREATE INDEX `AssessmentInterventionRule_isEnabled_idx` ON `AssessmentInterventionRule`(`isEnabled`);
CREATE INDEX `AssessmentInterventionRule_isDefault_idx` ON `AssessmentInterventionRule`(`isDefault`);