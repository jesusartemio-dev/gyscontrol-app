-- Verificar si las tablas de calendario existen y tienen datos
SELECT 'CalendarioLaboral' as tabla, COUNT(*) as registros FROM "CalendarioLaboral"
UNION ALL
SELECT 'DiaCalendario' as tabla, COUNT(*) as registros FROM "DiaCalendario"
UNION ALL
SELECT 'ExcepcionCalendario' as tabla, COUNT(*) as registros FROM "ExcepcionCalendario"
UNION ALL
SELECT 'ConfiguracionCalendario' as tabla, COUNT(*) as registros FROM "ConfiguracionCalendario";