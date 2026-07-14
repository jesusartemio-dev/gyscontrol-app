-- CreateTable
CREATE TABLE "tarifa_campo_personal" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "costoAlmuerzo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoMovilidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarifa_campo_personal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarifa_campo_personal_clienteId_userId_key" ON "tarifa_campo_personal"("clienteId", "userId");
CREATE INDEX "tarifa_campo_personal_clienteId_idx" ON "tarifa_campo_personal"("clienteId");
CREATE INDEX "tarifa_campo_personal_userId_idx" ON "tarifa_campo_personal"("userId");

-- AddForeignKey
ALTER TABLE "tarifa_campo_personal" ADD CONSTRAINT "tarifa_campo_personal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tarifa_campo_personal" ADD CONSTRAINT "tarifa_campo_personal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: trazabilidad "Requerimiento del día" -> Jornada de origen
ALTER TABLE "hoja_de_gastos" ADD COLUMN "origenRegistroCampoId" TEXT;
CREATE INDEX "hoja_de_gastos_origenRegistroCampoId_idx" ON "hoja_de_gastos"("origenRegistroCampoId");
ALTER TABLE "hoja_de_gastos" ADD CONSTRAINT "hoja_de_gastos_origenRegistroCampoId_fkey" FOREIGN KEY ("origenRegistroCampoId") REFERENCES "registro_horas_campo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: tarea placeholder auto-generada al marcar asistencia (check-in)
ALTER TABLE "registro_horas_campo_tarea" ADD COLUMN "esAutoAsistencia" BOOLEAN NOT NULL DEFAULT false;

-- Índice único parcial: como máximo una tarea placeholder por jornada.
-- Prisma no soporta WHERE en @@unique, por eso se crea a mano aquí.
CREATE UNIQUE INDEX "registro_horas_campo_tarea_auto_asistencia_unique"
  ON "registro_horas_campo_tarea" ("registroCampoId")
  WHERE "esAutoAsistencia" = true;

-- AlterTable: evita duplicar al mismo usuario dentro de la misma tarea (permite upsert idempotente)
ALTER TABLE "registro_horas_campo_miembro" ADD CONSTRAINT "registro_horas_campo_miembro_registroCampoTareaId_usuarioId_key" UNIQUE ("registroCampoTareaId", "usuarioId");
