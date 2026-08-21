-- Backfill: las recepciones históricas ya despachadas se consideran conformes.
-- Sin esto, toda la historia aparecería de golpe como "pendiente de confirmar"
-- e inundaría la cola nueva del solicitante.
-- Va en migración separada porque el valor del enum se agregó en la anterior y
-- Postgres no permite usarlo en la misma transacción donde se declara.

UPDATE "recepcion_pendiente"
SET "estado" = 'confirmado_proyecto',
    "fechaConfirmacionProyecto" = COALESCE("fechaEntregaProyecto", "updatedAt")
WHERE "estado" = 'entregado_proyecto';
