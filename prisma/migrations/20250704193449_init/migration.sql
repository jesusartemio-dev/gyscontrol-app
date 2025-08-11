/*
  Warnings:

  - You are about to drop the column `reemplazaAId` on the `ListaEquipoItem` table. All the data in the column will be lost.
  - You are about to drop the column `equipoOriginalId` on the `ProyectoEquipoItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ListaEquipoItem" DROP CONSTRAINT "ListaEquipoItem_reemplazaAId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipoItem" DROP CONSTRAINT "ProyectoEquipoItem_equipoOriginalId_fkey";

-- AlterTable
ALTER TABLE "ListaEquipoItem" DROP COLUMN "reemplazaAId",
ADD COLUMN     "reemplazaProyectoEquipoItemId" TEXT;

-- AlterTable
ALTER TABLE "ProyectoEquipoItem" DROP COLUMN "equipoOriginalId",
ADD COLUMN     "listaEquipoSeleccionadoId" TEXT;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_listaEquipoSeleccionadoId_fkey" FOREIGN KEY ("listaEquipoSeleccionadoId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_reemplazaProyectoEquipoItemId_fkey" FOREIGN KEY ("reemplazaProyectoEquipoItemId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
