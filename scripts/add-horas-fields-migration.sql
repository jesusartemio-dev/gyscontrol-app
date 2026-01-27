-- Migration script to add missing hours fields for complete MS Project XML export
-- Run this script to add horas fields to all cronograma levels

-- ===================================================
-- COTIZACIONES (Cronograma Comercial)
-- ===================================================

-- Nivel 1: Cotizacion
ALTER TABLE "cotizacion" ADD COLUMN "horasEstimadas" DECIMAL(10,2);

-- Nivel 2: CotizacionFase
ALTER TABLE "cotizacion_fase" ADD COLUMN "horasEstimadas" DECIMAL(10,2);

-- Nivel 4: CotizacionZona
ALTER TABLE "cotizacion_zona" ADD COLUMN "horasEstimadas" DECIMAL(10,2);

-- ===================================================
-- PROYECTOS (Cronograma de Ejecución)
-- ===================================================

-- Nivel 1: Proyecto
ALTER TABLE "proyecto" ADD COLUMN "horasEstimadas" DECIMAL(10,2);
ALTER TABLE "proyecto" ADD COLUMN "horasReales" DECIMAL(10,2) DEFAULT 0;

-- Nivel 2: ProyectoFase
ALTER TABLE "proyecto_fase" ADD COLUMN "horasPlan" DECIMAL(10,2);
ALTER TABLE "proyecto_fase" ADD COLUMN "horasReales" DECIMAL(10,2) DEFAULT 0;

-- Nivel 4: ProyectoZona
ALTER TABLE "proyecto_zona" ADD COLUMN "horasPlan" DECIMAL(10,2);
ALTER TABLE "proyecto_zona" ADD COLUMN "horasReales" DECIMAL(10,2) DEFAULT 0;

-- ===================================================
-- COMENTARIOS
-- ===================================================
-- Estos campos permiten:
-- 1. Exportación completa a MS Project con campos <Work>
-- 2. Consistencia en todos los niveles de la jerarquía
-- 3. Flexibilidad para cálculos de horas en cualquier nivel
-- 4. Compatibilidad con tareas hoja que no tienen hijos