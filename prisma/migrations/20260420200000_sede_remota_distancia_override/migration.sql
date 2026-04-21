-- CreateEnum
CREATE TYPE "EstadoUbicacionRemota" AS ENUM ('pendiente', 'aprobada', 'rechazada', 'reemplazada');

-- AlterTable
ALTER TABLE "asistencia" ADD COLUMN     "distanciaMetros" DOUBLE PRECISION,
ADD COLUMN     "ubicacionRemotaId" TEXT;

-- AlterTable
ALTER TABLE "jornada_asistencia" ADD COLUMN     "horaIngresoOverride" TEXT,
ADD COLUMN     "horaSalidaOverride" TEXT,
ADD COLUMN     "motivoOverride" TEXT;

-- CreateTable
CREATE TABLE "ubicacion_remota_personal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "radioMetros" INTEGER NOT NULL DEFAULT 100,
    "estado" "EstadoUbicacionRemota" NOT NULL DEFAULT 'pendiente',
    "aprobadoPorId" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "vigenciaDesde" TIMESTAMP(3),
    "vigenciaHasta" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ubicacion_remota_personal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ubicacion_remota_personal_userId_estado_idx" ON "ubicacion_remota_personal"("userId", "estado");

-- CreateIndex
CREATE INDEX "ubicacion_remota_personal_estado_idx" ON "ubicacion_remota_personal"("estado");

-- AddForeignKey
ALTER TABLE "ubicacion_remota_personal" ADD CONSTRAINT "ubicacion_remota_personal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicacion_remota_personal" ADD CONSTRAINT "ubicacion_remota_personal_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
