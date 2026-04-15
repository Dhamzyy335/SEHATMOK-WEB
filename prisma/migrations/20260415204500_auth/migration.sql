-- Remove legacy rows that do not have real credentials
DELETE FROM `User` WHERE `passwordHash` IS NULL;

-- AlterTable
ALTER TABLE `User`
    MODIFY `passwordHash` VARCHAR(191) NOT NULL;
