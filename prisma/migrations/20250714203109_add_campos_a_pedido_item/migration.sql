/*
  Warnings:

  - Added the required column `codigo` to the `PedidoEquipoItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcion` to the `PedidoEquipoItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unidad` to the `PedidoEquipoItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ListaEquipoItem" ADD COLUMN     "tiempoEntrega" TEXT,
ADD COLUMN     "tiempoEntregaDias" INTEGER;

-- AlterTable
ALTER TABLE "PedidoEquipoItem" ADD COLUMN     "codigo" TEXT NOT NULL,
ADD COLUMN     "descripcion" TEXT NOT NULL,
ADD COLUMN     "fechaEntregaEsperada" TIMESTAMP(3),
ADD COLUMN     "tiempoEntrega" TEXT,
ADD COLUMN     "tiempoEntregaDias" INTEGER,
ADD COLUMN     "unidad" TEXT NOT NULL;
