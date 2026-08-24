-- Días fijos de pago del cliente (ej. Nexa paga los 7 y 22 de cada mes).
-- Vacío (default) = sin calendario fijo, comportamiento idéntico al actual.
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "diasPagoProgramados" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
