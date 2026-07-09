-- CreateEnum
CREATE TYPE "FiltroAlcanceServicio" AS ENUM ('general', 'brownfield', 'detalle');

-- AlterTable
ALTER TABLE "catalogo_servicio" ADD COLUMN     "actividadTag" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "filtroAlcance" "FiltroAlcanceServicio" NOT NULL DEFAULT 'general',
ADD COLUMN     "notaCantidad" TEXT,
ADD COLUMN     "reglasDificultad" JSONB;
