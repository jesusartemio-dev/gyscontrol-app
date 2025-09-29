-- Script para verificar que las tablas existen
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'Proyecto%' ORDER BY tablename;