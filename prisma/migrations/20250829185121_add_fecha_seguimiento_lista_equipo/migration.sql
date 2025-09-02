-- AlterTable
ALTER TABLE "ListaEquipo" ADD COLUMN     "fechaAprobacionFinal" TIMESTAMP(3),
ADD COLUMN     "fechaAprobacionRevision" TIMESTAMP(3),
ADD COLUMN     "fechaEnvioLogistica" TIMESTAMP(3),
ADD COLUMN     "fechaEnvioRevision" TIMESTAMP(3),
ADD COLUMN     "fechaFinCotizacion" TIMESTAMP(3),
ADD COLUMN     "fechaInicioCotizacion" TIMESTAMP(3),
ADD COLUMN     "fechaNecesaria" TIMESTAMP(3),
ADD COLUMN     "fechaValidacion" TIMESTAMP(3);
