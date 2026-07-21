-- CreateTable
CREATE TABLE "iperc_version_archivo" (
    "id" TEXT NOT NULL,
    "ipercId" TEXT NOT NULL,
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

    CONSTRAINT "iperc_version_archivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "iperc_version_archivo_ipercId_subidoEn_idx" ON "iperc_version_archivo"("ipercId", "subidoEn" DESC);

-- AddForeignKey
ALTER TABLE "iperc_version_archivo" ADD CONSTRAINT "iperc_version_archivo_ipercId_fkey" FOREIGN KEY ("ipercId") REFERENCES "iperc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iperc_version_archivo" ADD CONSTRAINT "iperc_version_archivo_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
