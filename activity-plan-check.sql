SELECT
    u.name AS userName,
    u.email,
    u.role,
    u.schoolAccountId,
    p.name AS planName,
    pf.`key` AS featureKey,
    pf.value AS featureValue
FROM `User` u
LEFT JOIN `Subscription` s
    ON s.schoolAccountId = u.schoolAccountId
LEFT JOIN `Plan` p
    ON p.id = s.planId
LEFT JOIN `PlanFeature` pf
    ON pf.planId = p.id
WHERE u.role = 'ACTIVITY_LEADER'
  AND (
      pf.`key` LIKE 'service:%activity-program%'
      OR pf.`key` IS NULL
  )
ORDER BY u.email, pf.`key`;

SELECT
    u.email,
    sv.slug,
    sa.isEnabled,
    sa.isPaid
FROM `User` u
LEFT JOIN `ServiceAccess` sa
    ON sa.schoolAccountId = u.schoolAccountId
LEFT JOIN `Service` sv
    ON sv.id = sa.serviceId
WHERE u.role = 'ACTIVITY_LEADER'
  AND sv.slug LIKE '%activity-program%'
ORDER BY u.email, sv.slug;