-- CreateEnum
CREATE TYPE "TipoUbicacion" AS ENUM ('oficina', 'planta', 'obra');

-- CreateEnum
CREATE TYPE "TipoMarcaje" AS ENUM ('ingreso', 'salida', 'inicio_almuerzo', 'fin_almuerzo');

-- CreateEnum
CREATE TYPE "MetodoMarcaje" AS ENUM ('qr_estatico', 'qr_supervisor', 'gps_directo', 'manual_supervisor');

-- CreateEnum
CREATE TYPE "EstadoMarcaje" AS ENUM ('a_tiempo', 'tarde', 'muy_tarde', 'fuera_zona', 'dispositivo_nuevo');

-- CreateTable
CREATE TABLE "ubicacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoUbicacion" NOT NULL,
    "direccion" TEXT,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "radioMetros" INTEGER NOT NULL DEFAULT 150,
    "qrSecret" TEXT NOT NULL,
    "proyectoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "toleranciaMinutos" INTEGER NOT NULL DEFAULT 5,
    "limiteTardeMinutos" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "nombre" TEXT,
    "userAgent" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "modelo" TEXT,
    "resolucion" TEXT NOT NULL,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "aprobadoPorId" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "primeraVez" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaVez" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornada_asistencia" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "qrSecret" TEXT NOT NULL,
    "latitudInicio" DOUBLE PRECISION NOT NULL,
    "longitudInicio" DOUBLE PRECISION NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornada_asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "empleadoId" TEXT,
    "ubicacionId" TEXT,
    "jornadaAsistenciaId" TEXT,
    "tipo" "TipoMarcaje" NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEsperada" TIMESTAMP(3) NOT NULL,
    "minutosTarde" INTEGER NOT NULL DEFAULT 0,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "precisionGps" DOUBLE PRECISION,
    "dentroGeofence" BOOLEAN NOT NULL DEFAULT true,
    "metodoMarcaje" "MetodoMarcaje" NOT NULL,
    "supervisorMarcoId" TEXT,
    "dispositivoId" TEXT NOT NULL,
    "dispositivoEraNuevo" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoMarcaje" NOT NULL,
    "observacion" TEXT,
    "banderas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ubicacion_nombre_key" ON "ubicacion"("nombre");

-- CreateIndex
CREATE INDEX "dispositivo_userId_idx" ON "dispositivo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_userId_fingerprint_key" ON "dispositivo"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "jornada_asistencia_fecha_activa_idx" ON "jornada_asistencia"("fecha", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "jornada_asistencia_supervisorId_ubicacionId_fecha_key" ON "jornada_asistencia"("supervisorId", "ubicacionId", "fecha");

-- CreateIndex
CREATE INDEX "asistencia_userId_fechaHora_idx" ON "asistencia"("userId", "fechaHora");

-- CreateIndex
CREATE INDEX "asistencia_ubicacionId_fechaHora_idx" ON "asistencia"("ubicacionId", "fechaHora");

-- CreateIndex
CREATE INDEX "asistencia_fechaHora_idx" ON "asistencia"("fechaHora");

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada_asistencia" ADD CONSTRAINT "jornada_asistencia_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada_asistencia" ADD CONSTRAINT "jornada_asistencia_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "ubicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_jornadaAsistenciaId_fkey" FOREIGN KEY ("jornadaAsistenciaId") REFERENCES "jornada_asistencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_supervisorMarcoId_fkey" FOREIGN KEY ("supervisorMarcoId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

