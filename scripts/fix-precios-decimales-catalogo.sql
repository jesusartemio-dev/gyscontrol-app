-- =====================================================
-- Script: fix-precios-decimales-catalogo.sql
-- Descripción: Recorta a 2 decimales los campos de precio
--              en catalogo_equipo que tengan más de 2 decimales.
-- Tabla: catalogo_equipo
-- Campos: precioLista, precioInterno, precioVenta,
--         precioLogistica, precioReal, precioGerencia
-- Uso: Ejecutar SOLO en producción con precaución.
--      Hacer backup antes de correr.
-- =====================================================

-- 1. Ver cuántos registros serán afectados (verificación previa)
SELECT
  COUNT(*) AS total_afectados
FROM catalogo_equipo
WHERE
  "precioLista"    <> ROUND("precioLista"::numeric,    2) OR
  "precioInterno"  <> ROUND("precioInterno"::numeric,  2) OR
  "precioVenta"    <> ROUND("precioVenta"::numeric,    2) OR
  ("precioLogistica" IS NOT NULL AND "precioLogistica" <> ROUND("precioLogistica"::numeric, 2)) OR
  ("precioReal"      IS NOT NULL AND "precioReal"      <> ROUND("precioReal"::numeric,      2)) OR
  ("precioGerencia"  IS NOT NULL AND "precioGerencia"  <> ROUND("precioGerencia"::numeric,  2));

-- 2. Ver detalle de registros afectados (opcional, descomentar si se quiere revisar)
-- SELECT id, codigo, descripcion,
--   "precioLista",    ROUND("precioLista"::numeric,    2) AS precioLista_fix,
--   "precioInterno",  ROUND("precioInterno"::numeric,  2) AS precioInterno_fix,
--   "precioVenta",    ROUND("precioVenta"::numeric,    2) AS precioVenta_fix,
--   "precioLogistica",ROUND("precioLogistica"::numeric,2) AS precioLogistica_fix,
--   "precioReal",     ROUND("precioReal"::numeric,     2) AS precioReal_fix,
--   "precioGerencia", ROUND("precioGerencia"::numeric, 2) AS precioGerencia_fix
-- FROM catalogo_equipo
-- WHERE
--   "precioLista"    <> ROUND("precioLista"::numeric,    2) OR
--   "precioInterno"  <> ROUND("precioInterno"::numeric,  2) OR
--   "precioVenta"    <> ROUND("precioVenta"::numeric,    2) OR
--   ("precioLogistica" IS NOT NULL AND "precioLogistica" <> ROUND("precioLogistica"::numeric, 2)) OR
--   ("precioReal"      IS NOT NULL AND "precioReal"      <> ROUND("precioReal"::numeric,      2)) OR
--   ("precioGerencia"  IS NOT NULL AND "precioGerencia"  <> ROUND("precioGerencia"::numeric,  2));

-- 3. Aplicar la corrección
UPDATE catalogo_equipo
SET
  "precioLista"     = ROUND("precioLista"::numeric,     2),
  "precioInterno"   = ROUND("precioInterno"::numeric,   2),
  "precioVenta"     = ROUND("precioVenta"::numeric,     2),
  "precioLogistica" = CASE WHEN "precioLogistica" IS NOT NULL THEN ROUND("precioLogistica"::numeric, 2) ELSE NULL END,
  "precioReal"      = CASE WHEN "precioReal"      IS NOT NULL THEN ROUND("precioReal"::numeric,      2) ELSE NULL END,
  "precioGerencia"  = CASE WHEN "precioGerencia"  IS NOT NULL THEN ROUND("precioGerencia"::numeric,  2) ELSE NULL END,
  "updatedAt"       = NOW()
WHERE
  "precioLista"    <> ROUND("precioLista"::numeric,    2) OR
  "precioInterno"  <> ROUND("precioInterno"::numeric,  2) OR
  "precioVenta"    <> ROUND("precioVenta"::numeric,    2) OR
  ("precioLogistica" IS NOT NULL AND "precioLogistica" <> ROUND("precioLogistica"::numeric, 2)) OR
  ("precioReal"      IS NOT NULL AND "precioReal"      <> ROUND("precioReal"::numeric,      2)) OR
  ("precioGerencia"  IS NOT NULL AND "precioGerencia"  <> ROUND("precioGerencia"::numeric,  2));

-- 4. Verificar que no quedan registros afectados (debe retornar 0)
SELECT COUNT(*) AS pendientes_post_fix
FROM catalogo_equipo
WHERE
  "precioLista"    <> ROUND("precioLista"::numeric,    2) OR
  "precioInterno"  <> ROUND("precioInterno"::numeric,  2) OR
  "precioVenta"    <> ROUND("precioVenta"::numeric,    2) OR
  ("precioLogistica" IS NOT NULL AND "precioLogistica" <> ROUND("precioLogistica"::numeric, 2)) OR
  ("precioReal"      IS NOT NULL AND "precioReal"      <> ROUND("precioReal"::numeric,      2)) OR
  ("precioGerencia"  IS NOT NULL AND "precioGerencia"  <> ROUND("precioGerencia"::numeric,  2));
