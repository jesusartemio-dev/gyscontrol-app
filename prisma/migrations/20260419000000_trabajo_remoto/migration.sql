-- CreateEnum
CREATE TYPE "ModalidadTrabajo" AS ENUM ('presencial', 'remoto', 'hibrido');

-- CreateEnum
CREATE TYPE "EstadoSolicitudRemoto" AS ENUM ('pendiente', 'aprobado', 'rechazado', 'cancelado');

-- AlterEnum
ALTER TYPE "MetodoMarcaje" ADD VALUE 'remoto';

-- AlterTable
ALTER TABLE "empleado" ADD COLUMN     "diasRemoto" "DiaSemana"[] DEFAULT ARRAY[]::"DiaSemana"[],
ADD COLUMN     "modalidadTrabajo" "ModalidadTrabajo" NOT NULL DEFAULT 'presencial';

-- CreateTable
CREATE TABLE "solicitud_trabajo_remoto" (
    "id" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoSolicitudRemoto" NOT NULL DEFAULT 'pendiente',
    "aprobadorId" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_trabajo_remoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitud_trabajo_remoto_solicitanteId_estado_idx" ON "solicitud_trabajo_remoto"("solicitanteId", "estado");

-- CreateIndex
CREATE INDEX "solicitud_trabajo_remoto_fechaInicio_fechaFin_idx" ON "solicitud_trabajo_remoto"("fechaInicio", "fechaFin");

-- AddForeignKey
ALTER TABLE "solicitud_trabajo_remoto" ADD CONSTRAINT "solicitud_trabajo_remoto_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_trabajo_remoto" ADD CONSTRAINT "solicitud_trabajo_remoto_aprobadorId_fkey" FOREIGN KEY ("aprobadorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
