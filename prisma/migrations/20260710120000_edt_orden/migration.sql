-- AlterTable
ALTER TABLE "edt" ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "edt_orden_idx" ON "edt"("orden");
