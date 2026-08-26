-- Personal tercero: distinguirlo de la planilla y guardar su tarifa por día.
--
-- Motivo: obtenerCostoHoraPEN() derivaba TODO de sueldoPlanilla. Sin sueldo
-- cargado, calcularCostosLaborales() devolvía solo el EMO (S/ 25/mes), lo que
-- costeaba la hora de los terceros en S/ 0.12 e inflaba la rentabilidad de los
-- proyectos donde trabajaron.
--
-- Aditiva: el default 'planilla' deja a los 36 empleados existentes con el
-- comportamiento actual. Ningún cálculo cambia hasta marcar a alguien 'tercero'.

-- CreateEnum
CREATE TYPE "TipoPersonal" AS ENUM ('planilla', 'tercero');

-- AlterTable
ALTER TABLE "empleado"
  ADD COLUMN IF NOT EXISTS "tipoPersonal" "TipoPersonal" NOT NULL DEFAULT 'planilla',
  ADD COLUMN IF NOT EXISTS "tarifaDia" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "monedaTarifa" TEXT NOT NULL DEFAULT 'PEN';
