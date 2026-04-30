-- Agrega el valor 'visita_externa' al enum MetodoMarcaje.
-- Sirve para distinguir marcajes legítimos hechos en planta/cliente externo
-- (con GPS + observación de texto libre) de marcajes presenciales en sede oficial
-- y de bypass del sistema.
ALTER TYPE "MetodoMarcaje" ADD VALUE IF NOT EXISTS 'visita_externa';
