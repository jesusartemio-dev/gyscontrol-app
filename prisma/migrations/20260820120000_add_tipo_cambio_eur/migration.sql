-- Agrega tasa de cambio EUR (USD por 1 EUR) para soportar Órdenes de Compra en euros
ALTER TABLE "configuracion_general" ADD COLUMN "tipoCambioEur" DECIMAL(10,4) NOT NULL DEFAULT 1.08;
