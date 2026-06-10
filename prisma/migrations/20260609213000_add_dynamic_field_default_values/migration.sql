ALTER TABLE `DynamicField`
  ADD COLUMN `defaultValue` TEXT NULL,
  ADD COLUMN `defaultJson` JSON NULL,
  ADD COLUMN `autoSelectWhenLinked` BOOLEAN NOT NULL DEFAULT false;