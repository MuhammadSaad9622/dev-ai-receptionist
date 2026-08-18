-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('HVAC', 'PLUMBING', 'HVAC_AND_PLUMBING');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('VOICE', 'SMS');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "VoiceProvider" AS ENUM ('RETELL', 'VAPI', 'GEMINI_LIVE');

-- CreateEnum
CREATE TYPE "TriageCategory" AS ENUM ('EMERGENCY', 'ROUTINE_SCHEDULING', 'QUOTE_FOLLOW_UP', 'OUT_OF_SCOPE', 'RETENTION', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'FAILED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('OPEN', 'FOLLOWING_UP', 'WON', 'LOST', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('QUOTE_FOLLOW_UP', 'RETENTION');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpStepStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED_OPTED_OUT', 'FAILED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "EmergencyAlertStatus" AS ENUM ('PENDING', 'ACKED', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('CALL_RECORDING', 'SMS_MARKETING');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'DENIED', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "CrmProvider" AS ENUM ('SERVICETITAN', 'HOUSECALL_PRO', 'JOBBER', 'GOOGLE_CALENDAR');

-- CreateEnum
CREATE TYPE "CrmIntegrationStatus" AS ENUM ('ACTIVE', 'ERROR', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL DEFAULT 'HVAC',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "twilioPhoneNumber" TEXT,
    "twilioNumberSid" TEXT,
    "voiceProvider" "VoiceProvider" NOT NULL DEFAULT 'RETELL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "emergencyAckTimeoutSeconds" INTEGER NOT NULL DEFAULT 180,
    "emergencyEscalationChain" JSONB NOT NULL,
    "quoteFollowUpOffsetsDays" INTEGER[] DEFAULT ARRAY[2, 5, 10]::INTEGER[],
    "quoteExpiresAfterDays" INTEGER NOT NULL DEFAULT 14,
    "retentionCadenceMonths" INTEGER NOT NULL DEFAULT 6,
    "recordingDisclosureScript" TEXT NOT NULL DEFAULT 'This call may be recorded for quality and scheduling purposes.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "authUserId" TEXT NOT NULL,
    "onDuty" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "lastInteractionAt" TIMESTAMP(3),
    "lastJobCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "channel" "Channel" NOT NULL,
    "direction" "Direction" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerCallId" TEXT,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "transcript" TEXT,
    "recordingUrl" TEXT,
    "recordingConsentGiven" BOOLEAN,
    "triageCategory" "TriageCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
    "triageConfidence" DOUBLE PRECISION,
    "triageReasoning" TEXT,
    "triageEntities" JSONB,
    "status" "InteractionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "escalatedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "interactionId" TEXT,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER,
    "status" "QuoteStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextStepAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpStep" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "channel" "Channel" NOT NULL DEFAULT 'SMS',
    "status" "FollowUpStepStatus" NOT NULL DEFAULT 'PENDING',
    "messageBody" TEXT,
    "scheduledJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "interactionId" TEXT,
    "crmProvider" TEXT,
    "crmExternalId" TEXT,
    "jobType" TEXT,
    "technicianName" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "status" "EmergencyAlertStatus" NOT NULL DEFAULT 'PENDING',
    "notificationAttempts" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "scheduledEscalationJobId" TEXT,
    "ackedById" TEXT,
    "ackedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "CrmProvider" NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "status" "CrmIntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_fcmToken_key" ON "PushSubscription"("fcmToken");

-- CreateIndex
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_phone_key" ON "Customer"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Interaction_providerCallId_key" ON "Interaction"("providerCallId");

-- CreateIndex
CREATE INDEX "Interaction_organizationId_createdAt_idx" ON "Interaction"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Interaction_organizationId_triageCategory_idx" ON "Interaction"("organizationId", "triageCategory");

-- CreateIndex
CREATE INDEX "Interaction_customerId_idx" ON "Interaction"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_interactionId_key" ON "Quote"("interactionId");

-- CreateIndex
CREATE INDEX "Quote_organizationId_status_idx" ON "Quote"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpSequence_quoteId_key" ON "FollowUpSequence"("quoteId");

-- CreateIndex
CREATE INDEX "FollowUpSequence_organizationId_status_idx" ON "FollowUpSequence"("organizationId", "status");

-- CreateIndex
CREATE INDEX "FollowUpStep_sequenceId_idx" ON "FollowUpStep"("sequenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_interactionId_key" ON "Appointment"("interactionId");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_scheduledStart_idx" ON "Appointment"("organizationId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Appointment_crmProvider_crmExternalId_idx" ON "Appointment"("crmProvider", "crmExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyAlert_interactionId_key" ON "EmergencyAlert"("interactionId");

-- CreateIndex
CREATE INDEX "EmergencyAlert_organizationId_status_idx" ON "EmergencyAlert"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_organizationId_customerId_type_idx" ON "ConsentRecord"("organizationId", "customerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CrmIntegration_organizationId_key" ON "CrmIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_entityId_idx" ON "AuditLog"("organizationId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSequence" ADD CONSTRAINT "FollowUpSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSequence" ADD CONSTRAINT "FollowUpSequence_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSequence" ADD CONSTRAINT "FollowUpSequence_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpStep" ADD CONSTRAINT "FollowUpStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "FollowUpSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_ackedById_fkey" FOREIGN KEY ("ackedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmIntegration" ADD CONSTRAINT "CrmIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
