DELETE FROM `Workflow`
WHERE id IN (
  SELECT id FROM `__tmp_all_workflows`
);
