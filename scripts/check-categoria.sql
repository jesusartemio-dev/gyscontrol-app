SELECT cs.id, cs.nombre, cs.categoria, cs."cotizacionId"
FROM "CotizacionServicio" cs
WHERE cs."cotizacionId" = 'cmgf5k5ju0001l81w09g1ctd9'
ORDER BY cs.nombre
LIMIT 10;