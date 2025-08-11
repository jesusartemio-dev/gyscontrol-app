-- DropForeignKey
ALTER TABLE "CotizacionProveedorItem" DROP CONSTRAINT "CotizacionProveedorItem_listaEquipoItemId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoEquipoItem" DROP CONSTRAINT "PedidoEquipoItem_listaEquipoItemId_fkey";

-- AlterTable
ALTER TABLE "CotizacionProveedorItem" ADD COLUMN     "listaId" TEXT,
ALTER COLUMN "listaEquipoItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PedidoEquipoItem" ADD COLUMN     "listaId" TEXT,
ALTER COLUMN "listaEquipoItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
