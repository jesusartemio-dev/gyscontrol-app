-- CreateEnum
CREATE TYPE "SsomaDocTipo" AS ENUM ('PETS', 'IPERC', 'MATRIZ_EPP', 'PLAN_EMERGENCIA', 'PAR');

-- CreateEnum
CREATE TYPE "SsomaParSubtipo" AS ENUM ('ELECTRICO', 'ALTURA', 'ESPACIO_CONFINADO', 'TRABAJO_CALIENTE');

-- CreateEnum
CREATE TYPE "SsomaDocEstado" AS ENUM ('borrador', 'en_revision', 'aprobado_interno', 'enviado_cliente', 'aprobado_cliente', 'rechazado', 'vencido');

-- CreateEnum
CREATE TYPE "SsomaHabEstado" AS ENUM ('pendiente', 'habilitado', 'vencido', 'suspendido');

-- CreateTable
CREATE TABLE "ssoma_expediente" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigoCod" TEXT NOT NULL,
    "descripcionTrabajos" TEXT NOT NULL,
    "hayTrabajoElectrico" BOOLEAN NOT NULL DEFAULT false,
    "nivelElectrico" TEXT,
    "hayTrabajoAltura" BOOLEAN NOT NULL DEFAULT false,
    "hayEspacioConfinado" BOOLEAN NOT NULL DEFAULT false,
    "hayTrabajoCaliente" BOOLEAN NOT NULL DEFAULT false,
    "estadoHabilitacion" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaInicioObra" TIMESTAMP(3),
    "ingSeguridad" TEXT,
    "gestorNombre" TEXT,
    "ggNombre" TEXT,
    "driveFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssoma_expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ssoma_documento" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "tipo" "SsomaDocTipo" NOT NULL,
    "parSubtipo" "SsomaParSubtipo",
    "estado" "SsomaDocEstado" NOT NULL DEFAULT 'borrador',
    "codigoDocumento" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT '01',
    "titulo" TEXT NOT NULL,
    "contenidoTexto" TEXT,
    "promptUsado" TEXT,
    "driveFileId" TEXT,
    "driveUrl" TEXT,
    "nombreArchivo" TEXT,
    "generadoPorId" TEXT,
    "aprobadoPorId" TEXT,
    "fechaEnvioCliente" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "fechaVigencia" TIMESTAMP(3),
    "observaciones" TEXT,
    "agenteUsageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssoma_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ssoma_personal_habilitado" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "estado" "SsomaHabEstado" NOT NULL DEFAULT 'pendiente',
    "firmaDifusion" BOOLEAN NOT NULL DEFAULT false,
    "fechaFirma" TIMESTAMP(3),
    "tokenDifusion" TEXT,
    "certAlturaVence" TIMESTAMP(3),
    "certElectricoVence" TIMESTAMP(3),
    "certCalienteVence" TIMESTAMP(3),
    "aptitudMedicaVence" TIMESTAMP(3),
    "habilitadoPorId" TEXT,
    "fechaHabilitacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssoma_personal_habilitado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ssoma_expediente_proyectoId_key" ON "ssoma_expediente"("proyectoId");

-- CreateIndex
CREATE INDEX "ssoma_expediente_proyectoId_idx" ON "ssoma_expediente"("proyectoId");

-- CreateIndex
CREATE INDEX "ssoma_documento_expedienteId_tipo_idx" ON "ssoma_documento"("expedienteId", "tipo");

-- CreateIndex
CREATE INDEX "ssoma_documento_expedienteId_estado_idx" ON "ssoma_documento"("expedienteId", "estado");

-- CreateIndex
CREATE INDEX "ssoma_documento_estado_fechaVigencia_idx" ON "ssoma_documento"("estado", "fechaVigencia");

-- CreateIndex
CREATE UNIQUE INDEX "ssoma_personal_habilitado_tokenDifusion_key" ON "ssoma_personal_habilitado"("tokenDifusion");

-- CreateIndex
CREATE INDEX "ssoma_personal_habilitado_expedienteId_estado_idx" ON "ssoma_personal_habilitado"("expedienteId", "estado");

-- CreateIndex
CREATE INDEX "ssoma_personal_habilitado_tokenDifusion_idx" ON "ssoma_personal_habilitado"("tokenDifusion");

-- CreateIndex
CREATE UNIQUE INDEX "ssoma_personal_habilitado_expedienteId_userId_key" ON "ssoma_personal_habilitado"("expedienteId", "userId");

-- AddForeignKey
ALTER TABLE "ssoma_expediente" ADD CONSTRAINT "ssoma_expediente_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssoma_documento" ADD CONSTRAINT "ssoma_documento_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ssoma_expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssoma_documento" ADD CONSTRAINT "ssoma_documento_generadoPorId_fkey" FOREIGN KEY ("generadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssoma_documento" ADD CONSTRAINT "ssoma_documento_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssoma_personal_habilitado" ADD CONSTRAINT "ssoma_personal_habilitado_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ssoma_expediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssoma_personal_habilitado" ADD CONSTRAINT "ssoma_personal_habilitado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssoma_personal_habilitado" ADD CONSTRAINT "ssoma_personal_habilitado_habilitadoPorId_fkey" FOREIGN KEY ("habilitadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
