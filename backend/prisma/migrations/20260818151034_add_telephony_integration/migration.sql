-- CreateEnum
CREATE TYPE "TelephonyProvider" AS ENUM ('TWILIO');

-- CreateEnum
CREATE TYPE "TelephonyIntegrationStatus" AS ENUM ('PENDING', 'NUMBER_CONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "TelephonyIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "TelephonyProvider" NOT NULL DEFAULT 'TWILIO',
    "encryptedCredentials" TEXT NOT NULL,
    "twilioTrunkSid" TEXT,
    "twilioCredentialListSid" TEXT,
    "sipTerminationUri" TEXT,
    "retellImportedAt" TIMESTAMP(3),
    "status" "TelephonyIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelephonyIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelephonyIntegration_organizationId_key" ON "TelephonyIntegration"("organizationId");

-- AddForeignKey
ALTER TABLE "TelephonyIntegration" ADD CONSTRAINT "TelephonyIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
