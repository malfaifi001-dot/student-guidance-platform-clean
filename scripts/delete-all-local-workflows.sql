START TRANSACTION;

CREATE TEMPORARY TABLE tmp_all_workflows AS
SELECT id FROM `Workflow`;

CREATE TEMPORARY TABLE tmp_all_workflow_steps AS
SELECT id
FROM `WorkflowStep`
WHERE workflowId IN (
  SELECT id FROM tmp_all_workflows
);

CREATE TEMPORARY TABLE tmp_all_dynamic_fields AS
SELECT id
FROM `DynamicField`
WHERE stepId IN (
  SELECT id FROM tmp_all_workflow_steps
);

UPDATE `CaseValue`
SET fieldId = NULL
WHERE fieldId IN (
  SELECT id FROM tmp_all_dynamic_fields
);

UPDATE `CaseEntry`
SET workflowId = NULL
WHERE workflowId IN (
  SELECT id FROM tmp_all_workflows
);

DELETE FROM `DynamicFieldOption`
WHERE fieldId IN (
  SELECT id FROM tmp_all_dynamic_fields
);

DELETE FROM `DynamicField`
WHERE id IN (
  SELECT id FROM tmp_all_dynamic_fields
);

DELETE FROM `WorkflowStep`
WHERE id IN (
  SELECT id FROM tmp_all_workflow_steps
);

DELETE FROM `Workflow`
WHERE id IN (
  SELECT id FROM tmp_all_workflows
);

COMMIT;
