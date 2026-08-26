CREATE TABLE `WhatsAppMessageTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `content` TEXT NOT NULL,
    `coupon` VARCHAR(160) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NULL,
    `activatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WhatsAppMessageTemplate_isActive_idx`(`isActive`),
    INDEX `WhatsAppMessageTemplate_createdAt_idx`(`createdAt`),
    INDEX `WhatsAppMessageTemplate_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WhatsAppMessageTemplate`
    ADD CONSTRAINT `WhatsAppMessageTemplate_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
