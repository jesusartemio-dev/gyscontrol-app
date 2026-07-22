-- CreateTable
CREATE TABLE "pets_version_archivo" (
    "id" TEXT NOT NULL,
    "petsId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "webViewLink" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "archivoNombre" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL,
    "numeroRevision" TEXT NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'IMPORTADO',
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "subidoPorId" TEXT NOT NULL,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_version_archivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pets_version_archivo_petsId_subidoEn_idx" ON "pets_version_archivo"("petsId", "subidoEn" DESC);

-- AddForeignKey
ALTER TABLE "pets_version_archivo" ADD CONSTRAINT "pets_version_archivo_petsId_fkey" FOREIGN KEY ("petsId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets_version_archivo" ADD CONSTRAINT "pets_version_archivo_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
