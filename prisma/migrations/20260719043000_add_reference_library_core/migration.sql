-- CreateTable
CREATE TABLE `ReferenceLibraryItem` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `schoolAccountId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `itemType` ENUM('FOLDER', 'FILE') NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `allowDownload` BOOLEAN NOT NULL DEFAULT true,
    `originalFileName` VARCHAR(255) NULL,
    `storageKey` VARCHAR(255) NULL,
    `originalStorageKey` VARCHAR(255) NULL,
    `mimeType` VARCHAR(150) NULL,
    `fileExtension` VARCHAR(20) NULL,
    `sizeBytes` INTEGER NULL,
    `pdfCoverApplied` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReferenceLibraryItem_storageKey_key`(`storageKey`),
    UNIQUE INDEX `ReferenceLibraryItem_originalStorageKey_key`(`originalStorageKey`),
    INDEX `ReferenceLibraryItem_parentId_idx`(`parentId`),
    INDEX `ReferenceLibraryItem_schoolAccountId_idx`(`schoolAccountId`),
    INDEX `ReferenceLibraryItem_createdById_idx`(`createdById`),
    INDEX `ReferenceLibraryItem_itemType_idx`(`itemType`),
    INDEX `ReferenceLibraryItem_status_idx`(`status`),
    INDEX `ReferenceLibraryItem_sortOrder_idx`(`sortOrder`),
    INDEX `ReferenceLibraryItem_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferenceLibraryAudience` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `audienceType` ENUM('ALL_USERS', 'ROLE', 'USER') NOT NULL,
    `userId` VARCHAR(191) NULL,
    `role` ENUM(
        'ADMIN',
        'COUNSELOR',
        'ACTIVITY_LEADER',
        'TEACHER',
        'SCHOOL_OWNER',
        'STAFF'
    ) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReferenceLibraryAudience_itemId_idx`(`itemId`),
    INDEX `ReferenceLibraryAudience_audienceType_idx`(`audienceType`),
    INDEX `ReferenceLibraryAudience_userId_idx`(`userId`),
    INDEX `ReferenceLibraryAudience_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReferenceLibraryItem`
ADD CONSTRAINT `ReferenceLibraryItem_parentId_fkey`
FOREIGN KEY (`parentId`) REFERENCES `ReferenceLibraryItem`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferenceLibraryItem`
ADD CONSTRAINT `ReferenceLibraryItem_schoolAccountId_fkey`
FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferenceLibraryItem`
ADD CONSTRAINT `ReferenceLibraryItem_createdById_fkey`
FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferenceLibraryAudience`
ADD CONSTRAINT `ReferenceLibraryAudience_itemId_fkey`
FOREIGN KEY (`itemId`) REFERENCES `ReferenceLibraryItem`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferenceLibraryAudience`
ADD CONSTRAINT `ReferenceLibraryAudience_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;