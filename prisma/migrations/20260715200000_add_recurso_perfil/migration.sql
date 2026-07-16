-- CreateTable
CREATE TABLE "recurso_perfil" (
    "id" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "recursoMiembroId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurso_perfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurso_perfil_recursoId_recursoMiembroId_key" ON "recurso_perfil"("recursoId", "recursoMiembroId");

-- AddForeignKey
ALTER TABLE "recurso_perfil" ADD CONSTRAINT "recurso_perfil_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "recurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso_perfil" ADD CONSTRAINT "recurso_perfil_recursoMiembroId_fkey" FOREIGN KEY ("recursoMiembroId") REFERENCES "recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
