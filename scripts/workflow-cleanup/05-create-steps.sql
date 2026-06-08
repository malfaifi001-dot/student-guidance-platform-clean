CREATE TABLE `__tmp_all_workflow_steps` AS
SELECT id
FROM `WorkflowStep`
WHERE workflowId IN (
  SELECT id FROM `__tmp_all_workflows`
);
