-- Foto del EPP en el catálogo de la matriz, desde la biblioteca de imágenes.
--
-- Las 52 fotos vivían incrustadas en plantilla-mpp.xlsx, ancladas a filas
-- fijas: la foto de la fila 12 era la del EPP que cayera en la fila 12. Eso
-- impedía tocar el catálogo, porque agregar o reordenar un EPP descolocaba
-- todas las fotos siguientes.

ALTER TABLE "mpp_epp_catalogo" ADD COLUMN "catalogoImagenId" TEXT;
CREATE INDEX "mpp_epp_catalogo_catalogoImagenId_idx" ON "mpp_epp_catalogo"("catalogoImagenId");
ALTER TABLE "mpp_epp_catalogo" ADD CONSTRAINT "mpp_epp_catalogo_catalogoImagenId_fkey"
    FOREIGN KEY ("catalogoImagenId") REFERENCES "catalogo_imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
