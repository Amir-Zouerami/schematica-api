-- DropIndex
DROP INDEX "Endpoint_status_idx";

-- CreateIndex
CREATE INDEX "Endpoint_projectId_status_idx" ON "Endpoint"("projectId", "status");
