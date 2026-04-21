-- Cambios para soportar atención parcial:
--   1. Nuevo estado `atendida_parcial` en el enum.
--   2. Nueva columna `cantidadEntregada` en solicitud_herramienta_item.
--   3. Relación solicitud↔préstamo pasa de 1:1 a 1:N (FK se mueve al lado de préstamo).
--
-- Orden crítico: crear la nueva columna y migrar datos ANTES de eliminar la vieja.

-- 1) Nuevo valor del enum (no puede usarse en la misma transacción)
ALTER TYPE "EstadoSolicitudHerramienta" ADD VALUE 'atendida_parcial' BEFORE 'atendida';

-- 2) Nueva columna acumuladora de entregas por item
ALTER TABLE "solicitud_herramienta_item"
  ADD COLUMN "cantidadEntregada" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 3) Nueva columna en préstamo que apuntará a la solicitud (inversa de la vieja 1:1)
ALTER TABLE "prestamo_herramienta"
  ADD COLUMN "solicitudHerramientaId" TEXT;

-- 4) Migrar datos existentes: cada solicitud con prestamoId ya marca al préstamo correspondiente.
UPDATE "prestamo_herramienta" p
SET "solicitudHerramientaId" = s."id"
FROM "solicitud_herramienta" s
WHERE s."prestamoId" = p."id";

-- 5) Para solicitudes existentes en estado 'atendida' con prestamoId, sus items se consideran
--    100% entregados (lo que había antes era 1:1 total). Actualizamos cantidadEntregada = cantidad
--    para esos items, manteniendo historial consistente.
UPDATE "solicitud_herramienta_item" shi
SET "cantidadEntregada" = shi."cantidad"
FROM "solicitud_herramienta" s
WHERE shi."solicitudId" = s."id"
  AND s."estado" = 'atendida';

-- 6) Ahora sí: quitar la columna/índice/FK viejos del lado solicitud.
ALTER TABLE "solicitud_herramienta" DROP CONSTRAINT "solicitud_herramienta_prestamoId_fkey";
DROP INDEX "solicitud_herramienta_prestamoId_key";
ALTER TABLE "solicitud_herramienta" DROP COLUMN "prestamoId";

-- 7) FK nueva desde préstamo hacia solicitud.
ALTER TABLE "prestamo_herramienta"
  ADD CONSTRAINT "prestamo_herramienta_solicitudHerramientaId_fkey"
  FOREIGN KEY ("solicitudHerramientaId") REFERENCES "solicitud_herramienta"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
