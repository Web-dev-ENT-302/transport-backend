/*
  Warnings:

  - Added the required column `distanceKm` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMins` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceNaira` to the `Ride` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Ride` ADD COLUMN `distanceKm` DOUBLE NOT NULL,
    ADD COLUMN `durationMins` DOUBLE NOT NULL,
    ADD COLUMN `priceNaira` DECIMAL(10, 2) NOT NULL;
