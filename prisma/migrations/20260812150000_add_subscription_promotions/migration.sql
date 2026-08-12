-- Teachix subscription promotions V1. Existing activation codes remain separate.
CREATE TABLE `Promotion` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `discountType` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
  `discountValue` INTEGER NOT NULL,
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `totalUsageLimit` INTEGER NULL,
  `perAccountLimit` INTEGER NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Promotion_isActive_startsAt_endsAt_idx`(`isActive`, `startsAt`, `endsAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromotionPlan` (
  `id` VARCHAR(191) NOT NULL,
  `promotionId` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `PromotionPlan_promotionId_planId_key`(`promotionId`, `planId`),
  INDEX `PromotionPlan_planId_idx`(`planId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Coupon` (
  `id` VARCHAR(191) NOT NULL,
  `promotionId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `usageLimit` INTEGER NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Coupon_code_key`(`code`),
  INDEX `Coupon_promotionId_isActive_idx`(`promotionId`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CouponRedemption` (
  `id` VARCHAR(191) NOT NULL,
  `couponId` VARCHAR(191) NOT NULL,
  `promotionId` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `subscriptionId` VARCHAR(191) NULL,
  `paymentTransactionId` VARCHAR(191) NULL,
  `originalAmount` INTEGER NOT NULL,
  `discountAmount` INTEGER NOT NULL,
  `finalAmount` INTEGER NOT NULL,
  `redeemedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CouponRedemption_couponId_schoolAccountId_idx`(`couponId`, `schoolAccountId`),
  INDEX `CouponRedemption_promotionId_idx`(`promotionId`),
  INDEX `CouponRedemption_schoolAccountId_redeemedAt_idx`(`schoolAccountId`, `redeemedAt`),
  UNIQUE INDEX `CouponRedemption_paymentTransactionId_key`(`paymentTransactionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PromotionPlan` ADD CONSTRAINT `PromotionPlan_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PromotionPlan` ADD CONSTRAINT `PromotionPlan_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_paymentTransactionId_fkey` FOREIGN KEY (`paymentTransactionId`) REFERENCES `PaymentTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `BankTransferRequest`
  ADD COLUMN `couponCode` VARCHAR(191) NULL,
  ADD COLUMN `originalAmount` INTEGER NULL,
  ADD COLUMN `discountAmount` INTEGER NULL;
