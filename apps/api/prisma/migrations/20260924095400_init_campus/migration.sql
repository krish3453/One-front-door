-- CreateTable
CREATE TABLE "CampusLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "building" TEXT,
    "floor" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "openingHours" JSONB,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiningOutlet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,
    "locationId" TEXT,
    "phone" TEXT,
    "menuUrl" TEXT,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningOutlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiningHours" (
    "id" TEXT NOT NULL,
    "diningId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DiningHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "venue" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "organizer" TEXT,
    "registrationUrl" TEXT,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "description" TEXT,
    "available24x7" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampusLocation_name_idx" ON "CampusLocation"("name");

-- CreateIndex
CREATE INDEX "CampusLocation_category_idx" ON "CampusLocation"("category");

-- CreateIndex
CREATE INDEX "CampusLocation_building_idx" ON "CampusLocation"("building");

-- CreateIndex
CREATE INDEX "CampusService_name_idx" ON "CampusService"("name");

-- CreateIndex
CREATE INDEX "CampusService_category_idx" ON "CampusService"("category");

-- CreateIndex
CREATE INDEX "CampusService_locationId_idx" ON "CampusService"("locationId");

-- CreateIndex
CREATE INDEX "DiningOutlet_name_idx" ON "DiningOutlet"("name");

-- CreateIndex
CREATE INDEX "DiningOutlet_type_idx" ON "DiningOutlet"("type");

-- CreateIndex
CREATE INDEX "DiningOutlet_locationId_idx" ON "DiningOutlet"("locationId");

-- CreateIndex
CREATE INDEX "DiningHours_diningId_idx" ON "DiningHours"("diningId");

-- CreateIndex
CREATE INDEX "DiningHours_dayOfWeek_idx" ON "DiningHours"("dayOfWeek");

-- CreateIndex
CREATE INDEX "CampusEvent_startTime_idx" ON "CampusEvent"("startTime");

-- CreateIndex
CREATE INDEX "CampusEvent_category_idx" ON "CampusEvent"("category");

-- CreateIndex
CREATE INDEX "CampusEvent_organizer_idx" ON "CampusEvent"("organizer");

-- CreateIndex
CREATE INDEX "EmergencyContact_category_idx" ON "EmergencyContact"("category");

-- CreateIndex
CREATE INDEX "EmergencyContact_name_idx" ON "EmergencyContact"("name");

-- AddForeignKey
ALTER TABLE "CampusService" ADD CONSTRAINT "CampusService_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CampusLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningOutlet" ADD CONSTRAINT "DiningOutlet_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CampusLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningHours" ADD CONSTRAINT "DiningHours_diningId_fkey" FOREIGN KEY ("diningId") REFERENCES "DiningOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
