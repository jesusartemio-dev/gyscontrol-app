-- AlterTable
ALTER TABLE "proyecto" ADD COLUMN     "sede" TEXT;
ALTER TABLE "proyecto" ADD COLUMN     "etapa" TEXT;
ALTER TABLE "proyecto" ADD COLUMN     "codigoPEP" TEXT;
ALTER TABLE "proyecto" ADD COLUMN     "areaSeccion" TEXT;

-- AlterTable
ALTER TABLE "matriz_comunicacion" ADD COLUMN     "codigoDocumento" TEXT;
ALTER TABLE "matriz_comunicacion" ADD COLUMN     "revisionDocumento" TEXT NOT NULL DEFAULT '0';
ALTER TABLE "matriz_comunicacion" ADD COLUMN     "numeroConsultor" TEXT;
ALTER TABLE "matriz_comunicacion" ADD COLUMN     "desarrolloNombre" TEXT;
ALTER TABLE "matriz_comunicacion" ADD COLUMN     "verificoNombre" TEXT;
ALTER TABLE "matriz_comunicacion" ADD COLUMN     "aproboNombre" TEXT;
ALTER TABLE "matriz_comunicacion" ADD COLUMN     "autorizoNombre" TEXT;
