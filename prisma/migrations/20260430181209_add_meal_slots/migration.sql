/*
  Warnings:

  - A unique constraint covering the columns `[userId,date,slot]` on the table `MealPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `mealplan` DROP FOREIGN KEY `MealPlan_userId_fkey`;

-- DropIndex
DROP INDEX `MealPlan_userId_date_recipeId_key` ON `mealplan`;

-- AlterTable
ALTER TABLE `mealplan` ADD COLUMN `slot` ENUM('BREAKFAST', 'LUNCH', 'DINNER') NOT NULL DEFAULT 'LUNCH';

-- CreateIndex
CREATE UNIQUE INDEX `MealPlan_userId_date_slot_key` ON `MealPlan`(`userId`, `date`, `slot`);

-- AddForeignKey
ALTER TABLE `mealplan` ADD CONSTRAINT `MealPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
