-- CreateEnum
CREATE TYPE "RegimenLaboral" AS ENUM ('mype', 'general');

-- AlterTable
ALTER TABLE "empleado" ADD COLUMN     "regimenLaboral" "RegimenLaboral" NOT NULL DEFAULT 'mype';

-- CreateTable
CREATE TABLE "concepto_gasto_fijo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concepto_gasto_fijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gasto_fijo_mensual" (
    "id" TEXT NOT NULL,
    "conceptoId" TEXT NOT NULL,
    "mes" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "observaciones" TEXT,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gasto_fijo_mensual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gasto_fijo_mensual_conceptoId_mes_key" ON "gasto_fijo_mensual"("conceptoId", "mes");

-- AddForeignKey
ALTER TABLE "gasto_fijo_mensual" ADD CONSTRAINT "gasto_fijo_mensual_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "concepto_gasto_fijo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto_fijo_mensual" ADD CONSTRAINT "gasto_fijo_mensual_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

