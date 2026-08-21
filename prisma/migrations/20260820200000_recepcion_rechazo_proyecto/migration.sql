-- Marca de devolución por disconformidad del proyecto. Se conserva como
-- historial aunque el ítem se vuelva a despachar y confirmar, para que Logística
-- distinga un ítem recién llegado a almacén de uno rebotado por obra.
ALTER TABLE "recepcion_pendiente" ADD COLUMN "fechaRechazoProyecto" TIMESTAMP(3);
