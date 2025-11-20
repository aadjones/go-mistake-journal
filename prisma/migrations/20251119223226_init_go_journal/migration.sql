-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sgf" TEXT NOT NULL,
    "playerColor" TEXT NOT NULL,
    "opponentRank" TEXT,
    "timeControl" TEXT,
    "datePlayed" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Mistake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "moveIndex" INTEGER NOT NULL,
    "boardState" TEXT NOT NULL,
    "briefDescription" TEXT NOT NULL,
    "primaryTag" TEXT NOT NULL,
    "detailedReflection" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mistake_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "mistakesAnalyzed" INTEGER NOT NULL,
    "mistakeIdsMap" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_sgf_key" ON "Game"("sgf");

-- CreateIndex
CREATE INDEX "Game_datePlayed_idx" ON "Game"("datePlayed");

-- CreateIndex
CREATE INDEX "Mistake_gameId_idx" ON "Mistake"("gameId");

-- CreateIndex
CREATE INDEX "Mistake_primaryTag_idx" ON "Mistake"("primaryTag");

-- CreateIndex
CREATE INDEX "Mistake_createdAt_idx" ON "Mistake"("createdAt");

-- CreateIndex
CREATE INDEX "Insight_createdAt_idx" ON "Insight"("createdAt");
