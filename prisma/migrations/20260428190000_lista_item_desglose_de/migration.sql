-- Add nullable column to mark a lista_equipo_item as a "linea" of a desglose
ALTER TABLE "lista_equipo_item"
  ADD COLUMN IF NOT EXISTS "desgloseDeProyectoEquipoCotizadoItemId" TEXT;

-- FK with SetNull: si se elimina el cotizado padre, el lista item queda sin marca
ALTER TABLE "lista_equipo_item"
  ADD CONSTRAINT "lista_equipo_item_desgloseDeProyectoEquipoCotizadoItemId_fkey"
  FOREIGN KEY ("desgloseDeProyectoEquipoCotizadoItemId")
  REFERENCES "proyecto_equipo_cotizado_item"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for queries that group lista items by desglose padre
CREATE INDEX IF NOT EXISTS "idx_lista_item_desglose_de"
  ON "lista_equipo_item"("desgloseDeProyectoEquipoCotizadoItemId");
