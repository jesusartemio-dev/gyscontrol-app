-- CreateEnum
CREATE TYPE "OrigenPartida" AS ENUM ('equipo', 'servicio', 'gasto', 'libre');

-- CreateTable
CREATE TABLE "partida_valorizacion" (
    "id" TEXT NOT NULL,
    "valorizacionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "origen" "OrigenPartida" NOT NULL DEFAULT 'libre',
    "proyectoEquipoCotizadoId" TEXT,
    "proyectoServicioCotizadoId" TEXT,
    "proyectoGastoCotizadoId" TEXT,
    "proyectoEdtId" TEXT,
    "montoContractual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcentajeAvance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montoAvance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcentajeAcumuladoAnterior" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montoAcumuladoAnterior" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partida_valorizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partida_valorizacion_valorizacionId_idx" ON "partida_valorizacion"("valorizacionId");

-- AddForeignKey
ALTER TABLE "partida_valorizacion" ADD CONSTRAINT "partida_valorizacion_valorizacionId_fkey" FOREIGN KEY ("valorizacionId") REFERENCES "valorizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
