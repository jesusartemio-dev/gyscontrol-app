-- Add precioGerencia to catalogo_equipo (special internal price, visible only to gerente/admin)
ALTER TABLE "catalogo_equipo" ADD COLUMN "precioGerencia" DOUBLE PRECISION;

-- Add precioGerencia to cotizacion_equipo_item (snapshot copied from catalog at item creation)
ALTER TABLE "cotizacion_equipo_item" ADD COLUMN "precioGerencia" DOUBLE PRECISION;
