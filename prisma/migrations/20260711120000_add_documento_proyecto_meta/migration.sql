-- CreateTable
CREATE TABLE "documento_proyecto_meta" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigoDocumento" TEXT,
    "revisionDocumento" TEXT NOT NULL DEFAULT '0',
    "numeroConsultor" TEXT,
    "desarrolloNombre" TEXT,
    "verificoNombre" TEXT,
    "aproboNombre" TEXT,
    "autorizoNombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_proyecto_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documento_proyecto_meta_proyectoId_tipo_key" ON "documento_proyecto_meta"("proyectoId", "tipo");

-- AddForeignKey
ALTER TABLE "documento_proyecto_meta" ADD CONSTRAINT "documento_proyecto_meta_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
