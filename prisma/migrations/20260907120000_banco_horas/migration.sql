-- Banco de Horas: banco de horas trabajadas vs. jornada esperada, calculado
-- desde registro_horas (aprobado=true), nunca desde asistencia. Ver
-- src/lib/services/bancoHoras.ts.

-- AlterTable
ALTER TABLE "timesheet_aprobacion" ADD COLUMN     "pagadoEnEfectivo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "jornada_esperada" (
    "id" TEXT NOT NULL,
    "lunes" DOUBLE PRECISION NOT NULL DEFAULT 9.5,
    "martes" DOUBLE PRECISION NOT NULL DEFAULT 9.5,
    "miercoles" DOUBLE PRECISION NOT NULL DEFAULT 9.5,
    "jueves" DOUBLE PRECISION NOT NULL DEFAULT 9.5,
    "viernes" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "sabado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "domingo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornada_esperada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banco_horas_ajuste_dia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "motivo" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banco_horas_ajuste_dia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banco_horas_saldo_inicial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saldoInicial" DOUBLE PRECISION NOT NULL,
    "fechaCorte" DATE NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banco_horas_saldo_inicial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banco_horas_ajuste_dia_userId_fecha_key" ON "banco_horas_ajuste_dia"("userId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "banco_horas_saldo_inicial_userId_key" ON "banco_horas_saldo_inicial"("userId");

-- AddForeignKey
ALTER TABLE "banco_horas_ajuste_dia" ADD CONSTRAINT "banco_horas_ajuste_dia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banco_horas_ajuste_dia" ADD CONSTRAINT "banco_horas_ajuste_dia_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banco_horas_saldo_inicial" ADD CONSTRAINT "banco_horas_saldo_inicial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banco_horas_saldo_inicial" ADD CONSTRAINT "banco_horas_saldo_inicial_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
