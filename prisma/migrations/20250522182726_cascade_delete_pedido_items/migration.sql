-- DropForeignKey
ALTER TABLE "PedidoEquipoItem" DROP CONSTRAINT "PedidoEquipoItem_pedidoId_fkey";

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
