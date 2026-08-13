-- CreateEnum
CREATE TYPE "EstadoAbonoFactoring" AS ENUM ('pendiente', 'recibido');

-- CreateEnum
CREATE TYPE "TipoAbonoFactoring" AS ENUM ('adelanto', 'saldo_girar', 'detraccion', 'excedente');

-- AlterTable: abono_valorizacion
-- monto/fecha pasan de obligatorios a opcionales (se renombran a montoReal/fechaReal
-- en el modelo de Prisma vía @map, pero la columna física sigue llamándose igual —
-- las filas existentes no se tocan, solo se relaja la restriccion NOT NULL).
ALTER TABLE "abono_valorizacion" ALTER COLUMN "monto" DROP NOT NULL;
ALTER TABLE "abono_valorizacion" ALTER COLUMN "fecha" DROP NOT NULL;
ALTER TABLE "abono_valorizacion" ADD COLUMN     "tipo" "TipoAbonoFactoring",
ADD COLUMN     "estado" "EstadoAbonoFactoring" NOT NULL DEFAULT 'recibido',
ADD COLUMN     "montoEsperado" DOUBLE PRECISION,
ADD COLUMN     "fechaEsperada" TIMESTAMP(3),
ADD COLUMN     "pagoCobroId" TEXT;

-- AlterTable: pago_cobro
ALTER TABLE "pago_cobro" ADD COLUMN     "esAjusteMora" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "abono_valorizacion_pagoCobroId_key" ON "abono_valorizacion"("pagoCobroId");

-- AddForeignKey
ALTER TABLE "abono_valorizacion" ADD CONSTRAINT "abono_valorizacion_pagoCobroId_fkey" FOREIGN KEY ("pagoCobroId") REFERENCES "pago_cobro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
