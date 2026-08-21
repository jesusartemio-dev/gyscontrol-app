-- Backfill de devoluciones registradas antes de que existiera fechaRechazoProyecto.
-- Una recepción en 'en_almacen' con observacionesConformidad solo puede venir del
-- rechazo del proyecto: los otros flujos que escriben ese campo dejan la
-- recepción en 'confirmado_proyecto' o 'entregado_proyecto'.
UPDATE "recepcion_pendiente"
SET "fechaRechazoProyecto" = "updatedAt"
WHERE "estado" = 'en_almacen'
  AND "observacionesConformidad" IS NOT NULL
  AND "fechaRechazoProyecto" IS NULL;
