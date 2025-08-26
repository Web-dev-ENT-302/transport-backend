/*
  Warnings:

  - Made the column `phone` on table `Driver` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Driver` MODIFY `phone` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Student` MODIFY `phone` VARCHAR(191) NOT NULL;
