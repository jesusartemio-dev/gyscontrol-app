-- DropForeignKey
ALTER TABLE "PedidoEquipo" DROP CONSTRAINT "PedidoEquipo_listaId_fkey";

-- AlterTable
ALTER TABLE "PedidoEquipo" ALTER COLUMN "listaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
