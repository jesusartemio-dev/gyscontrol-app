-- Migration: peso manual por fase (Fase 2 — Peso por fase)
-- Columna aditiva, nullable. No toca datos existentes.

-- AlterTable
ALTER TABLE "proyecto_fase" ADD COLUMN "pesoManual" DOUBLE PRECISION;
