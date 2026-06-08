DELETE FROM `DynamicField`
WHERE id IN (
  SELECT id FROM `__tmp_all_dynamic_fields`
);
