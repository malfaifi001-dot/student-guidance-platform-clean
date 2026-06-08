DELETE FROM `WorkflowStep`
WHERE id IN (
  SELECT id FROM `__tmp_all_workflow_steps`
);
