/*
  Warnings:

  - You are about to drop the column `fechaEntregaEsperada` on the `PedidoEquipoItem` table. All the data in the column will be lost.
  - You are about to drop the column `fechaNecesaria` on the `PedidoEquipoItem` table. All the data in the column will be lost.
  - Added the required column `fechaNecesaria` to the `PedidoEquipo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PedidoEquipo" ADD COLUMN     "fechaNecesaria" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PedidoEquipoItem" DROP COLUMN "fechaEntregaEsperada",
DROP COLUMN "fechaNecesaria",
ADD COLUMN     "fechaOrdenCompraRecomendada" TIMESTAMP(3);
