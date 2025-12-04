-- Script para obtener lista completa de tablas de NEON
-- Solo consultas de solo lectura

-- Lista todas las tablas del esquema público
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- También obtener información adicional
SELECT 
    table_name,
    table_type,
    table_schema,
    is_insertable_into,
    is_typed
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;