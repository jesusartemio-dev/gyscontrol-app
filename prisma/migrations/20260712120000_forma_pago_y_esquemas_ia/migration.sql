-- AlterTable
ALTER TABLE "proyecto_cotizacion_documento" ADD COLUMN     "formaPago" JSONB;

-- AlterTable
ALTER TABLE "proyecto_cronograma_generacion_ia" ADD COLUMN     "esquemasPropuestos" JSONB;
ALTER TABLE "proyecto_cronograma_generacion_ia" ADD COLUMN     "esquemaElegido" JSONB;
