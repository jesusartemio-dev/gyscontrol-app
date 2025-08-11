/*
  Warnings:

  - Added the required column `responsableId` to the `ListaEquipo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `responsableId` to the `ListaEquipoItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `responsableId` to the `PedidoEquipoItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ListaEquipo" ADD COLUMN     "responsableId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ListaEquipoItem" ADD COLUMN     "responsableId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PedidoEquipoItem" ADD COLUMN     "responsableId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ListaEquipo" ADD CONSTRAINT "ListaEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
