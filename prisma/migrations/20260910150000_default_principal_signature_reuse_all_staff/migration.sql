-- Change the default for newly created profiles only. Existing policy values
-- remain untouched, including explicitly stored MANUAL_ONLY and SELECTED_STAFF.
ALTER TABLE `SchoolProfile`
  MODIFY COLUMN `principalSignatureReusePolicy` ENUM('ALL_STAFF', 'SELECTED_STAFF', 'MANUAL_ONLY') NOT NULL DEFAULT 'ALL_STAFF';
