CREATE TABLE `__tmp_all_dynamic_fields` AS
SELECT id
FROM `DynamicField`
WHERE stepId IN (
  SELECT id FROM `__tmp_all_workflow_steps`
);
