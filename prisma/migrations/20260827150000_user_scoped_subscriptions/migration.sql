-- Add nullable ownership first so legacy rows can be preserved when ownership
-- cannot be proven from existing billing evidence.
ALTER TABLE `Subscription` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `ManualActivation` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `ServiceAccess` ADD COLUMN `userId` VARCHAR(191) NULL;

-- The old commercial-owner constraint prevented more than one subscriber in a
-- school. Keep the tenant column, but make it a normal indexed context field.
CREATE INDEX `Subscription_schoolAccountId_idx` ON `Subscription`(`schoolAccountId`);
DROP INDEX `Subscription_schoolAccountId_key` ON `Subscription`;
CREATE INDEX `ServiceAccess_schoolAccountId_serviceId_idx` ON `ServiceAccess`(`schoolAccountId`, `serviceId`);
DROP INDEX `ServiceAccess_schoolAccountId_serviceId_key` ON `ServiceAccess`;
CREATE INDEX `ManualActivation_userId_idx` ON `ManualActivation`(`userId`);
CREATE UNIQUE INDEX `ServiceAccess_userId_serviceId_key` ON `ServiceAccess`(`userId`, `serviceId`);
CREATE INDEX `ServiceAccess_userId_idx` ON `ServiceAccess`(`userId`);

-- Deterministic legacy backfill: an invoice issuer is usable only when the
-- subscription's billing history identifies exactly one same-school user.
UPDATE `Subscription` AS s
JOIN (
  SELECT MIN(c.`id`) AS `id`, c.`userId`
  FROM (
    SELECT s2.`id`, MIN(u.`id`) AS `userId`
    FROM `Subscription` AS s2
    JOIN `PaymentTransaction` AS pt ON pt.`subscriptionId` = s2.`id`
    JOIN `Invoice` AS i ON i.`paymentTransactionId` = pt.`id`
    JOIN `User` AS u ON u.`id` = i.`issuedById`
      AND u.`schoolAccountId` = s2.`schoolAccountId`
    GROUP BY s2.`id`
    HAVING COUNT(DISTINCT u.`id`) = 1
  ) AS c
  GROUP BY c.`userId`
  HAVING COUNT(*) = 1
) AS owner ON owner.`id` = s.`id`
SET s.`userId` = owner.`userId`
WHERE s.`userId` IS NULL;

-- A default-free subscription is safely attributable only when the school has
-- exactly one user. Ambiguous legacy rows intentionally remain NULL.
UPDATE `Subscription` AS s
JOIN `Plan` AS p ON p.`id` = s.`planId` AND p.`slug` = 'default-free-auto'
JOIN `User` AS u ON u.`schoolAccountId` = s.`schoolAccountId`
SET s.`userId` = u.`id`
WHERE s.`userId` IS NULL
  AND (
    SELECT COUNT(*) FROM `User` AS same_school_user
    WHERE same_school_user.`schoolAccountId` = s.`schoolAccountId`
  ) = 1;

-- Enforce one commercial subscription per user only after the deterministic
-- backfill has run. Any ambiguous legacy row remains NULL and is preserved.
CREATE UNIQUE INDEX `Subscription_userId_key` ON `Subscription`(`userId`);

ALTER TABLE `Subscription`
  ADD CONSTRAINT `Subscription_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ManualActivation`
  ADD CONSTRAINT `ManualActivation_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ServiceAccess`
  ADD CONSTRAINT `ServiceAccess_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `BankTransferRequest`
  ADD CONSTRAINT `BankTransferRequest_requesterUserId_fkey`
  FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
