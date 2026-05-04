-- Observación por ítem al registrar una devolución parcial o total.
-- Permite que el almacenero anote la condición en que regresó cada herramienta
-- (ej: "vino con golpe en la carcasa", "falta el cargador", "OK").
ALTER TABLE "prestamo_herramienta_item" ADD COLUMN "observacionDevolucion" TEXT;
