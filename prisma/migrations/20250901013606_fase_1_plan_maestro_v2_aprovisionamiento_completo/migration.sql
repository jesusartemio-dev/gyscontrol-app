/*
  Warnings:

  - The `estadoAnterior` column on the `historial_aprovisionamiento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `estadoNuevo` column on the `historial_aprovisionamiento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `creadoPor` on the `pago` table. All the data in the column will be lost.
  - You are about to drop the column `inspeccionadoPor` on the `recepcion` table. All the data in the column will be lost.
  - You are about to drop the column `recibidoPor` on the `recepcion` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `historial_aprovisionamiento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `responsableRecepcionId` to the `recepcion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoAprovisionamiento" ADD VALUE 'INICIADO';
ALTER TYPE "EstadoAprovisionamiento" ADD VALUE 'RECIBIDO';
ALTER TYPE "EstadoAprovisionamiento" ADD VALUE 'PAGADO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoMovimiento" ADD VALUE 'CREACION';
ALTER TYPE "TipoMovimiento" ADD VALUE 'ACTUALIZACION';
ALTER TYPE "TipoMovimiento" ADD VALUE 'APROBACION';
ALTER TYPE "TipoMovimiento" ADD VALUE 'RECHAZO';
ALTER TYPE "TipoMovimiento" ADD VALUE 'RECEPCION';
ALTER TYPE "TipoMovimiento" ADD VALUE 'PAGO';
ALTER TYPE "TipoMovimiento" ADD VALUE 'COMPLETADO';
ALTER TYPE "TipoMovimiento" ADD VALUE 'CANCELACION';
ALTER TYPE "TipoMovimiento" ADD VALUE 'SUSPENSION';
ALTER TYPE "TipoMovimiento" ADD VALUE 'REACTIVACION';

-- DropForeignKey
ALTER TABLE "pago" DROP CONSTRAINT "pago_creadoPor_fkey";

-- DropForeignKey
ALTER TABLE "recepcion" DROP CONSTRAINT "recepcion_recibidoPor_fkey";

-- AlterTable
ALTER TABLE "historial_aprovisionamiento" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "estadoAnterior",
ADD COLUMN     "estadoAnterior" "EstadoAprovisionamiento",
DROP COLUMN "estadoNuevo",
ADD COLUMN     "estadoNuevo" "EstadoAprovisionamiento";

-- AlterTable
ALTER TABLE "pago" DROP COLUMN "creadoPor",
ADD COLUMN     "entidadFinanciera" TEXT,
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3),
ADD COLUMN     "recepcionId" TEXT;

-- AlterTable
ALTER TABLE "recepcion" DROP COLUMN "inspeccionadoPor",
DROP COLUMN "recibidoPor",
ADD COLUMN     "estadoInspeccion" "EstadoInspeccion" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "responsableInspeccionId" TEXT,
ADD COLUMN     "responsableRecepcionId" TEXT NOT NULL,
ALTER COLUMN "documentos" DROP NOT NULL,
ALTER COLUMN "documentos" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_aprobadoPor_fkey" FOREIGN KEY ("aprobadoPor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion" ADD CONSTRAINT "recepcion_responsableRecepcionId_fkey" FOREIGN KEY ("responsableRecepcionId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion" ADD CONSTRAINT "recepcion_responsableInspeccionId_fkey" FOREIGN KEY ("responsableInspeccionId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_aprobadoPor_fkey" FOREIGN KEY ("aprobadoPor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
