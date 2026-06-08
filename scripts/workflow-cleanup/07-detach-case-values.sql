UPDATE `CaseValue`
SET fieldId = NULL
WHERE fieldId IN (
  SELECT id FROM `__tmp_all_dynamic_fields`
);
