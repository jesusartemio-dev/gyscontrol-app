-- AlterTable
ALTER TABLE "ListaEquipoItem" ADD COLUMN     "reemplazaAId" TEXT;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_reemplazaAId_fkey" FOREIGN KEY ("reemplazaAId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
