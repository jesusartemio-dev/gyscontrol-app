-- Tracking de prompt caching de la API de Anthropic.
-- cache_creation_input_tokens = tokens escritos al cache (cuestan 1.25x del input base).
-- cache_read_input_tokens = tokens leidos del cache (cuestan 0.10x del input base).
-- Tracker los suma por separado para calcular hit-rate y ahorro real vs sin cache.
ALTER TABLE "agente_usage" ADD COLUMN "tokensCacheCreation" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agente_usage" ADD COLUMN "tokensCacheRead" INTEGER NOT NULL DEFAULT 0;
