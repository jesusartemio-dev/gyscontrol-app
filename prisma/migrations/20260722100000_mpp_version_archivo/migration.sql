-- CreateTable
CREATE TABLE "mpp_version_archivo" (
    "id" TEXT NOT NULL,
    "mppId" TEXT NOT NULL,
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

    CONSTRAINT "mpp_version_archivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mpp_version_archivo_mppId_subidoEn_idx" ON "mpp_version_archivo"("mppId", "subidoEn" DESC);

-- AddForeignKey
ALTER TABLE "mpp_version_archivo" ADD CONSTRAINT "mpp_version_archivo_mppId_fkey" FOREIGN KEY ("mppId") REFERENCES "mpp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mpp_version_archivo" ADD CONSTRAINT "mpp_version_archivo_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
