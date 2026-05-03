-- CreateTable
CREATE TABLE `AiRecipeLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `inputIngredients` JSON NOT NULL,
    `outputRecipeTitle` VARCHAR(500) NULL,
    `status` ENUM('SUCCESS', 'FAILED') NOT NULL,
    `errorMessage` VARCHAR(1000) NULL,
    `latencyMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiRecipeLog_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AiRecipeLog_status_idx`(`status`),
    INDEX `AiRecipeLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiRecipeLog` ADD CONSTRAINT `AiRecipeLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
