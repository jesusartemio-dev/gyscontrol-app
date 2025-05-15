-- AlterTable
ALTER TABLE "ProyectoEquipoItem" ADD COLUMN     "listaId" TEXT;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
