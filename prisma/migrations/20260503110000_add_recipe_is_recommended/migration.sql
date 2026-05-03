-- AlterTable
ALTER TABLE `Recipe`
    ADD COLUMN `isRecommended` BOOLEAN NOT NULL DEFAULT false;
