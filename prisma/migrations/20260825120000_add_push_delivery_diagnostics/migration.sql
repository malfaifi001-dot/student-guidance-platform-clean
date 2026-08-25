ALTER TABLE `PushDelivery`
  ADD COLUMN `provider` VARCHAR(40) NULL,
  ADD COLUMN `attemptCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `sentAt` DATETIME(3) NULL,
  ADD COLUMN `failedAt` DATETIME(3) NULL,
  ADD COLUMN `errorCategory` VARCHAR(40) NULL,
  ADD COLUMN `safeErrorMessage` TEXT NULL,
  ADD COLUMN `retryable` BOOLEAN NOT NULL DEFAULT false;

UPDATE `PushDelivery`
SET
  `provider` = 'firebase-cloud-messaging',
  `attemptCount` = CASE WHEN `retryCount` > 0 THEN `retryCount` ELSE CASE WHEN `attemptedAt` IS NULL THEN 0 ELSE 1 END END,
  `sentAt` = CASE WHEN `status` = 'SUCCESS' THEN `attemptedAt` ELSE NULL END,
  `failedAt` = CASE WHEN `status` = 'FAILED' THEN `attemptedAt` ELSE NULL END,
  `errorCategory` = CASE WHEN `invalidToken` = true THEN 'TOKEN_UNREGISTERED' ELSE NULL END,
  `retryable` = CASE WHEN `nextRetryAt` IS NOT NULL THEN true ELSE false END;
