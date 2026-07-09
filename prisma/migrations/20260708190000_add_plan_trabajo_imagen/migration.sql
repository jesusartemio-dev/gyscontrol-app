-- CreateTable
CREATE TABLE "plan_trabajo_imagen" (
    "id" TEXT NOT NULL,
    "planTrabajoId" TEXT NOT NULL,
    "edtRef" TEXT NOT NULL,
    "subItemRef" TEXT,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "driveFileId" TEXT,
    "tipoArchivo" TEXT,
    "tamano" INTEGER,
    "caption" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "plan_trabajo_imagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_trabajo_imagen_planTrabajoId_edtRef_idx" ON "plan_trabajo_imagen"("planTrabajoId", "edtRef");

-- AddForeignKey
ALTER TABLE "plan_trabajo_imagen" ADD CONSTRAINT "plan_trabajo_imagen_planTrabajoId_fkey" FOREIGN KEY ("planTrabajoId") REFERENCES "plan_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_trabajo_imagen" ADD CONSTRAINT "plan_trabajo_imagen_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

