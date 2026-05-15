-- ============================================================
-- Migración: Módulo de Ausencias + Módulo de Planificación
-- Fecha: 2026-05-14
-- Nota: Esta migración fue generada con `prisma migrate diff`
-- y aplicada manualmente con `prisma db execute` debido a un
-- problema pre-existente en el shadow database (migración
-- 20260212_margen_to_factor_venta_costo). Ver README.
-- ============================================================

-- CreateEnum
CREATE TYPE "TipoCicloSaldo" AS ENUM ('anio_calendario', 'anio_servicio', 'sin_ciclo');

-- CreateEnum
CREATE TYPE "EstadoSolicitudAusencia" AS ENUM ('borrador', 'pendiente', 'aprobada', 'rechazada', 'cancelada', 'en_curso', 'finalizada');

-- CreateEnum
CREATE TYPE "TurnoDia" AS ENUM ('dia_completo', 'am', 'pm');

-- CreateTable
CREATE TABLE "tipo_ausencia" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "descuentaSaldo" BOOLEAN NOT NULL DEFAULT true,
    "diasPorDefecto" DOUBLE PRECISION,
    "tipoCicloSaldo" "TipoCicloSaldo" NOT NULL DEFAULT 'sin_ciclo',
    "requiereDocumento" BOOLEAN NOT NULL DEFAULT false,
    "requiereAprobacion" BOOLEAN NOT NULL DEFAULT true,
    "requiereAprobacion2" BOOLEAN NOT NULL DEFAULT false,
    "diasUmbralAprobacion2" INTEGER,
    "aplicaFinDeSemana" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_ausencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_ausencia" (
    "id" TEXT NOT NULL,
    "tipoAusenciaId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "turnoInicio" "TurnoDia" NOT NULL DEFAULT 'dia_completo',
    "turnoFin" "TurnoDia" NOT NULL DEFAULT 'dia_completo',
    "diasHabiles" DOUBLE PRECISION,
    "motivo" TEXT,
    "estado" "EstadoSolicitudAusencia" NOT NULL DEFAULT 'borrador',
    "requiereAsignacionAprobador" BOOLEAN NOT NULL DEFAULT false,
    "aprobador1Id" TEXT,
    "fechaAprobacion1" TIMESTAMP(3),
    "aprobador2Id" TEXT,
    "fechaAprobacion2" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "rechazadoPorId" TEXT,
    "fechaRechazo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_ausencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_ausencia_adjunto" (
    "id" TEXT NOT NULL,
    "solicitudAusenciaId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "driveFileId" TEXT,
    "tipoArchivo" TEXT,
    "tamano" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitud_ausencia_adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo_ausencia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoAusenciaId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "diasAsignados" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasGozados" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasPendientes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasDisponibles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldo_ausencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_saldo_ausencia" (
    "id" TEXT NOT NULL,
    "saldoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dias" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT,
    "referenciaId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_saldo_ausencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planificacion_dia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "turno" "TurnoDia" NOT NULL DEFAULT 'dia_completo',
    "proyectoId" TEXT,
    "solicitudAusenciaId" TEXT,
    "tipoAusenciaId" TEXT,
    "esExcepcional" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planificacion_dia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_ausencia_codigo_key" ON "tipo_ausencia"("codigo");

-- CreateIndex
CREATE INDEX "tipo_ausencia_activo_orden_idx" ON "tipo_ausencia"("activo", "orden");

-- CreateIndex
CREATE INDEX "solicitud_ausencia_solicitanteId_estado_idx" ON "solicitud_ausencia"("solicitanteId", "estado");

-- CreateIndex
CREATE INDEX "solicitud_ausencia_estado_fechaInicio_idx" ON "solicitud_ausencia"("estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "solicitud_ausencia_fechaInicio_fechaFin_idx" ON "solicitud_ausencia"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "solicitud_ausencia_adjunto_solicitudAusenciaId_idx" ON "solicitud_ausencia_adjunto"("solicitudAusenciaId");

-- CreateIndex
CREATE INDEX "saldo_ausencia_userId_anio_idx" ON "saldo_ausencia"("userId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "saldo_ausencia_userId_tipoAusenciaId_anio_key" ON "saldo_ausencia"("userId", "tipoAusenciaId", "anio");

-- CreateIndex
CREATE INDEX "movimiento_saldo_ausencia_saldoId_createdAt_idx" ON "movimiento_saldo_ausencia"("saldoId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "planificacion_dia_fecha_userId_idx" ON "planificacion_dia"("fecha", "userId");

-- CreateIndex
CREATE INDEX "planificacion_dia_userId_fecha_idx" ON "planificacion_dia"("userId", "fecha");

-- CreateIndex
CREATE INDEX "planificacion_dia_proyectoId_fecha_idx" ON "planificacion_dia"("proyectoId", "fecha");

-- CreateIndex
CREATE INDEX "planificacion_dia_fecha_idx" ON "planificacion_dia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "planificacion_dia_userId_fecha_turno_key" ON "planificacion_dia"("userId", "fecha", "turno");

-- AddForeignKey
ALTER TABLE "solicitud_ausencia" ADD CONSTRAINT "solicitud_ausencia_tipoAusenciaId_fkey" FOREIGN KEY ("tipoAusenciaId") REFERENCES "tipo_ausencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_ausencia" ADD CONSTRAINT "solicitud_ausencia_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_ausencia" ADD CONSTRAINT "solicitud_ausencia_aprobador1Id_fkey" FOREIGN KEY ("aprobador1Id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_ausencia" ADD CONSTRAINT "solicitud_ausencia_aprobador2Id_fkey" FOREIGN KEY ("aprobador2Id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_ausencia" ADD CONSTRAINT "solicitud_ausencia_rechazadoPorId_fkey" FOREIGN KEY ("rechazadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_ausencia_adjunto" ADD CONSTRAINT "solicitud_ausencia_adjunto_solicitudAusenciaId_fkey" FOREIGN KEY ("solicitudAusenciaId") REFERENCES "solicitud_ausencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_ausencia" ADD CONSTRAINT "saldo_ausencia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_ausencia" ADD CONSTRAINT "saldo_ausencia_tipoAusenciaId_fkey" FOREIGN KEY ("tipoAusenciaId") REFERENCES "tipo_ausencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_saldo_ausencia" ADD CONSTRAINT "movimiento_saldo_ausencia_saldoId_fkey" FOREIGN KEY ("saldoId") REFERENCES "saldo_ausencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_saldo_ausencia" ADD CONSTRAINT "movimiento_saldo_ausencia_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificacion_dia" ADD CONSTRAINT "planificacion_dia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificacion_dia" ADD CONSTRAINT "planificacion_dia_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificacion_dia" ADD CONSTRAINT "planificacion_dia_solicitudAusenciaId_fkey" FOREIGN KEY ("solicitudAusenciaId") REFERENCES "solicitud_ausencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificacion_dia" ADD CONSTRAINT "planificacion_dia_tipoAusenciaId_fkey" FOREIGN KEY ("tipoAusenciaId") REFERENCES "tipo_ausencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificacion_dia" ADD CONSTRAINT "planificacion_dia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificacion_dia" ADD CONSTRAINT "planificacion_dia_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraint agregado manualmente (Prisma no soporta CHECK nativos).
-- proyectoId XOR solicitudAusenciaId: exactamente uno debe estar presente.
-- Una celda sin ambos (stand-by/libre) no tiene fila en esta tabla.
ALTER TABLE "planificacion_dia"
ADD CONSTRAINT "planificacion_dia_proyecto_o_ausencia_check"
CHECK (
  ("proyectoId" IS NOT NULL AND "solicitudAusenciaId" IS NULL) OR
  ("proyectoId" IS NULL AND "solicitudAusenciaId" IS NOT NULL)
);
