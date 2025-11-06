-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Endpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "operation" JSONB NOT NULL,
    "projectId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Endpoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Endpoint_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Endpoint_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Endpoint" ("createdAt", "creatorId", "id", "method", "operation", "path", "projectId", "updatedAt", "updatedById") SELECT "createdAt", "creatorId", "id", "method", "operation", "path", "projectId", "updatedAt", "updatedById" FROM "Endpoint";
DROP TABLE "Endpoint";
ALTER TABLE "new_Endpoint" RENAME TO "Endpoint";
CREATE INDEX "Endpoint_status_idx" ON "Endpoint"("status");
CREATE UNIQUE INDEX "Endpoint_projectId_path_method_key" ON "Endpoint"("projectId", "path", "method");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
