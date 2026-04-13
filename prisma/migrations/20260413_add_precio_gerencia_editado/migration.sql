-- Add precioGerenciaEditado flag to cotizacion_equipo_item
-- true = gerente edited this value manually in cotizacion (propagated back to catalog)
-- false = came from catalog snapshot or fallback to precioInterno
ALTER TABLE "cotizacion_equipo_item" ADD COLUMN "precioGerenciaEditado" BOOLEAN NOT NULL DEFAULT false;
