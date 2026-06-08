UPDATE `CaseEntry`
SET workflowId = NULL
WHERE workflowId IN (
  SELECT id FROM `__tmp_all_workflows`
);
