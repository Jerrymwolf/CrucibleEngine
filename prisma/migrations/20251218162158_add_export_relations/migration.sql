-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "scenarioSeed" TEXT,
    "companyName" TEXT,
    "companyValues" TEXT[],
    "crucibleMasterId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "statedValues" TEXT[],
    "valuesRankOrder" INTEGER[],
    "decisionProcess" TEXT NOT NULL DEFAULT 'consensus',
    "commitmentStatement" TEXT,
    "isAIControlled" BOOLEAN NOT NULL DEFAULT false,
    "aiArchetype" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "personalValues" TEXT[],
    "valuesRankOrder" INTEGER[],
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "decisionTypeId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "rationale" TEXT,
    "targetParishId" TEXT,
    "simulationTime" INTEGER NOT NULL,
    "realTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valuesAnalysis" JSONB,
    "notableMoment" BOOLEAN NOT NULL DEFAULT false,
    "notableReason" TEXT,
    "consequencesApplied" JSONB,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionAdvocate" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "position" TEXT NOT NULL,

    CONSTRAINT "DecisionAdvocate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingContentRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "urgency" INTEGER NOT NULL,
    "relatedParish" TEXT,
    "breaking" BOOLEAN NOT NULL DEFAULT false,
    "simulationTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamingContentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'facilitator',
    "category" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participantId" TEXT,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipientId" TEXT,
    "filePath" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreCrisisProfile" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "topFiveValues" TEXT[],
    "roundTimings" INTEGER[],
    "cardsConsidered" TEXT[],
    "valueMeanings" JSONB NOT NULL,
    "storyText" TEXT,
    "selfIdentifiedValues" TEXT[],
    "peerIdentifiedValues" TEXT[],
    "alignmentFlag" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreCrisisProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCommitment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "commitmentText" TEXT NOT NULL,
    "decisionProcess" TEXT NOT NULL,
    "processDescription" TEXT,
    "valuesCheckTrigger" TEXT,
    "signatures" TEXT[],
    "readAloudAt" TIMESTAMP(3),
    "orgValues" TEXT[],
    "orgAlignmentRatings" JSONB,
    "orgExtensionCommitment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValuesScore" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "simulationTime" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "intensityLevel" INTEGER NOT NULL,
    "scores" JSONB NOT NULL,
    "affect" TEXT NOT NULL,
    "behavior" TEXT NOT NULL,
    "cognition" TEXT NOT NULL,
    "desire" TEXT NOT NULL,
    "isNotable" BOOLEAN NOT NULL DEFAULT false,
    "notableReason" TEXT,
    "notableCategory" TEXT,
    "commitmentAlignment" TEXT NOT NULL,
    "commitmentComparisonQuote" TEXT,
    "valuesCheckTriggered" BOOLEAN NOT NULL DEFAULT false,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet',
    "confidence" INTEGER NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValuesScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CMIntervention" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "reason" TEXT,
    "content" TEXT,
    "simulationTime" INTEGER NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CMIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferReflection" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "realSituation" TEXT NOT NULL,
    "valueTested" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "wouldDoDifferently" TEXT,
    "pressureTrigger" TEXT NOT NULL,
    "commitmentAction" TEXT NOT NULL,
    "valueProtected" TEXT NOT NULL,
    "fullCommitment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferReflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CMRateLicense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "simulationsLimit" INTEGER,
    "simulationsCreated" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT,

    CONSTRAINT "CMRateLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionSnapshot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "simulationTime" INTEGER NOT NULL,
    "revenueImpact" DOUBLE PRECISION NOT NULL,
    "productionHoursLost" DOUBLE PRECISION NOT NULL,
    "quarterlyProgress" DOUBLE PRECISION NOT NULL,
    "pipelineStatus" TEXT NOT NULL,
    "patientsAffected" INTEGER NOT NULL,
    "childrenAffected" INTEGER NOT NULL,
    "workersAtRisk" INTEGER NOT NULL,
    "workersEvacuated" INTEGER NOT NULL,
    "globalStockpileWeeks" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");

-- CreateIndex
CREATE INDEX "Session_code_idx" ON "Session"("code");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Team_sessionId_idx" ON "Team"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_sessionId_parishId_key" ON "Team"("sessionId", "parishId");

-- CreateIndex
CREATE INDEX "Participant_teamId_idx" ON "Participant"("teamId");

-- CreateIndex
CREATE INDEX "Decision_sessionId_simulationTime_idx" ON "Decision"("sessionId", "simulationTime");

-- CreateIndex
CREATE INDEX "Decision_teamId_idx" ON "Decision"("teamId");

-- CreateIndex
CREATE INDEX "Decision_sessionId_teamId_idx" ON "Decision"("sessionId", "teamId");

-- CreateIndex
CREATE INDEX "Decision_categoryId_idx" ON "Decision"("categoryId");

-- CreateIndex
CREATE INDEX "DecisionAdvocate_decisionId_idx" ON "DecisionAdvocate"("decisionId");

-- CreateIndex
CREATE INDEX "DecisionAdvocate_participantId_idx" ON "DecisionAdvocate"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionAdvocate_decisionId_participantId_key" ON "DecisionAdvocate"("decisionId", "participantId");

-- CreateIndex
CREATE INDEX "StreamingContentRecord_sessionId_simulationTime_idx" ON "StreamingContentRecord"("sessionId", "simulationTime");

-- CreateIndex
CREATE INDEX "Reflection_sessionId_idx" ON "Reflection"("sessionId");

-- CreateIndex
CREATE INDEX "Reflection_teamId_idx" ON "Reflection"("teamId");

-- CreateIndex
CREATE INDEX "Reflection_participantId_idx" ON "Reflection"("participantId");

-- CreateIndex
CREATE INDEX "Reflection_sessionId_teamId_idx" ON "Reflection"("sessionId", "teamId");

-- CreateIndex
CREATE INDEX "Report_sessionId_type_idx" ON "Report"("sessionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PreCrisisProfile_participantId_key" ON "PreCrisisProfile"("participantId");

-- CreateIndex
CREATE INDEX "PreCrisisProfile_participantId_idx" ON "PreCrisisProfile"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamCommitment_teamId_key" ON "TeamCommitment"("teamId");

-- CreateIndex
CREATE INDEX "TeamCommitment_teamId_idx" ON "TeamCommitment"("teamId");

-- CreateIndex
CREATE INDEX "TeamCommitment_sessionId_idx" ON "TeamCommitment"("sessionId");

-- CreateIndex
CREATE INDEX "ValuesScore_decisionId_idx" ON "ValuesScore"("decisionId");

-- CreateIndex
CREATE INDEX "ValuesScore_teamId_idx" ON "ValuesScore"("teamId");

-- CreateIndex
CREATE INDEX "ValuesScore_sessionId_teamId_idx" ON "ValuesScore"("sessionId", "teamId");

-- CreateIndex
CREATE INDEX "ValuesScore_sessionId_simulationTime_idx" ON "ValuesScore"("sessionId", "simulationTime");

-- CreateIndex
CREATE INDEX "ValuesScore_isNotable_idx" ON "ValuesScore"("isNotable");

-- CreateIndex
CREATE INDEX "CMIntervention_sessionId_idx" ON "CMIntervention"("sessionId");

-- CreateIndex
CREATE INDEX "CMIntervention_teamId_idx" ON "CMIntervention"("teamId");

-- CreateIndex
CREATE INDEX "CMIntervention_sessionId_teamId_idx" ON "CMIntervention"("sessionId", "teamId");

-- CreateIndex
CREATE INDEX "TransferReflection_sessionId_idx" ON "TransferReflection"("sessionId");

-- CreateIndex
CREATE INDEX "TransferReflection_participantId_idx" ON "TransferReflection"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");

-- CreateIndex
CREATE INDEX "UserAccount_email_idx" ON "UserAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CMRateLicense_userId_key" ON "CMRateLicense"("userId");

-- CreateIndex
CREATE INDEX "CMRateLicense_userId_idx" ON "CMRateLicense"("userId");

-- CreateIndex
CREATE INDEX "CMRateLicense_isActive_expiresAt_idx" ON "CMRateLicense"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "ProductionSnapshot_sessionId_simulationTime_idx" ON "ProductionSnapshot"("sessionId", "simulationTime");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionAdvocate" ADD CONSTRAINT "DecisionAdvocate_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionAdvocate" ADD CONSTRAINT "DecisionAdvocate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamingContentRecord" ADD CONSTRAINT "StreamingContentRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreCrisisProfile" ADD CONSTRAINT "PreCrisisProfile_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCommitment" ADD CONSTRAINT "TeamCommitment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CMRateLicense" ADD CONSTRAINT "CMRateLicense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionSnapshot" ADD CONSTRAINT "ProductionSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
