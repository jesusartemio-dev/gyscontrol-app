-- AlterTable: Add override fields to gasto_linea for per-line project/cost center assignment
ALTER TABLE "gasto_linea" ADD COLUMN "proyectoId" TEXT;
ALTER TABLE "gasto_linea" ADD COLUMN "centroCostoId" TEXT;
ALTER TABLE "gasto_linea" ADD COLUMN "categoriaCosto" "CategoriaCosto";

-- AddForeignKey
ALTER TABLE "gasto_linea" ADD CONSTRAINT "gasto_linea_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto_linea" ADD CONSTRAINT "gasto_linea_centroCostoId_fkey" FOREIGN KEY ("centroCostoId") REFERENCES "centro_costo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
