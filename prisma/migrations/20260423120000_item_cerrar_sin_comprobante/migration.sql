-- AlterTable
ALTER TABLE "gasto_linea" ADD COLUMN     "requerimientoMaterialItemId" TEXT;

-- AlterTable
ALTER TABLE "requerimiento_material_item" ADD COLUMN     "cerradoSinCompEn" TIMESTAMP(3),
ADD COLUMN     "cerradoSinCompPorId" TEXT,
ADD COLUMN     "motivoSinComprobante" TEXT,
ADD COLUMN     "sinComprobante" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "gasto_linea_requerimientoMaterialItemId_idx" ON "gasto_linea"("requerimientoMaterialItemId");

-- AddForeignKey
ALTER TABLE "gasto_linea" ADD CONSTRAINT "gasto_linea_requerimientoMaterialItemId_fkey" FOREIGN KEY ("requerimientoMaterialItemId") REFERENCES "requerimiento_material_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimiento_material_item" ADD CONSTRAINT "requerimiento_material_item_cerradoSinCompPorId_fkey" FOREIGN KEY ("cerradoSinCompPorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
