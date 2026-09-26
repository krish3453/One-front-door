/*
  Warnings:

  - A unique constraint covering the columns `[diningId,dayOfWeek]` on the table `DiningHours` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CampusEvent" ADD COLUMN     "audience" TEXT,
ADD COLUMN     "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "CampusLocation" ADD COLUMN     "accessibility" JSONB,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facilities" JSONB,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "room" TEXT,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "DiningOutlet" ADD COLUMN     "cuisine" TEXT,
ADD COLUMN     "features" JSONB,
ADD COLUMN     "paymentMethods" JSONB,
ADD COLUMN     "priceRange" TEXT;

-- AlterTable
ALTER TABLE "EmergencyContact" ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE INDEX "CampusEvent_status_idx" ON "CampusEvent"("status");

-- CreateIndex
CREATE INDEX "CampusLocation_shortName_idx" ON "CampusLocation"("shortName");

-- CreateIndex
CREATE INDEX "CampusLocation_status_idx" ON "CampusLocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DiningHours_diningId_dayOfWeek_key" ON "DiningHours"("diningId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "DiningOutlet_cuisine_idx" ON "DiningOutlet"("cuisine");

-- CreateIndex
CREATE INDEX "EmergencyContact_locationId_idx" ON "EmergencyContact"("locationId");

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CampusLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
