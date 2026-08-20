ALTER TABLE `Promotion`
  ADD COLUMN `isAutomatic` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `Promotion_isAutomatic_isActive_startsAt_endsAt_idx`
  ON `Promotion`(`isAutomatic`, `isActive`, `startsAt`, `endsAt`);
