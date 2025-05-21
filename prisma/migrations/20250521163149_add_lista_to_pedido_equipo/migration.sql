/*
  Warnings:

  - Added the required column `listaId` to the `PedidoEquipo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CotizacionProveedorItem" ADD COLUMN     "esSeleccionada" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "PedidoEquipo" ADD COLUMN     "listaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PedidoEquipoItem" ADD COLUMN     "comentarioLogistica" TEXT;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
