-- CreateTable
CREATE TABLE "catalogo_imagen" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoria" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_imagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalogo_imagen_categoria_idx" ON "catalogo_imagen"("categoria");

-- AddForeignKey
ALTER TABLE "catalogo_imagen" ADD CONSTRAINT "catalogo_imagen_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
