-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'lobby',
ALTER COLUMN "code" SET DATA TYPE VARCHAR(8);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "color" TEXT;

-- CreateTable
CREATE TABLE "ParticipantToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "teamId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "sessionCode" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "severity" TEXT NOT NULL DEFAULT 'INFO',

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantToken_token_key" ON "ParticipantToken"("token");

-- CreateIndex
CREATE INDEX "ParticipantToken_token_idx" ON "ParticipantToken"("token");

-- CreateIndex
CREATE INDEX "ParticipantToken_linkedUserId_idx" ON "ParticipantToken"("linkedUserId");

-- CreateIndex
CREATE INDEX "ParticipantSession_sessionCode_idx" ON "ParticipantSession"("sessionCode");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSession_tokenId_sessionCode_key" ON "ParticipantSession"("tokenId", "sessionCode");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- AddForeignKey
ALTER TABLE "ParticipantToken" ADD CONSTRAINT "ParticipantToken_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "ParticipantToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
