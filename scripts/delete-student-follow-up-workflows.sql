START TRANSACTION;

CREATE TEMPORARY TABLE tmp_student_follow_up_workflows AS
SELECT w.id
FROM `Workflow` w
JOIN `Service` s ON s.id = w.serviceId
WHERE s.slug = 'student-follow-up';

CREATE TEMPORARY TABLE tmp_student_follow_up_steps AS
SELECT ws.id
FROM `WorkflowStep` ws
JOIN tmp_student_follow_up_workflows tw ON tw.id = ws.workflowId;

CREATE TEMPORARY TABLE tmp_student_follow_up_fields AS
SELECT df.id
FROM `DynamicField` df
JOIN tmp_student_follow_up_steps ts ON ts.id = df.stepId;

UPDATE `CaseValue`
SET fieldId = NULL
WHERE fieldId IN (
  SELECT id FROM tmp_student_follow_up_fields
);

UPDATE `CaseEntry`
SET workflowId = NULL
WHERE workflowId IN (
  SELECT id FROM tmp_student_follow_up_workflows
);

DELETE FROM `DynamicFieldOption`
WHERE fieldId IN (
  SELECT id FROM tmp_student_follow_up_fields
);

DELETE FROM `DynamicField`
WHERE id IN (
  SELECT id FROM tmp_student_follow_up_fields
);

DELETE FROM `WorkflowStep`
WHERE id IN (
  SELECT id FROM tmp_student_follow_up_steps
);

DELETE FROM `Workflow`
WHERE id IN (
  SELECT id FROM tmp_student_follow_up_workflows
);

COMMIT;
