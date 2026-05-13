-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigoDocumento" TEXT,
    "revision" TEXT DEFAULT '01',
    "fechaEmision" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "area" TEXT DEFAULT 'Proyectos',
    "alcance" TEXT,
    "preparadoPor" TEXT,
    "preparadoCargo" TEXT,
    "revisadoPor1" TEXT,
    "revisadoCargo1" TEXT,
    "revisadoPor2" TEXT,
    "revisadoCargo2" TEXT,
    "aprobadoPor" TEXT,
    "aprobadoCargo" TEXT,
    "contenido" JSONB,
    "iaEnCurso" BOOLEAN NOT NULL DEFAULT false,
    "iaExpiraEn" TIMESTAMP(3),
    "estado" TEXT DEFAULT 'borrador',

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pets_proyectoId_key" ON "pets"("proyectoId");

-- CreateIndex
CREATE INDEX "pets_proyectoId_idx" ON "pets"("proyectoId");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
