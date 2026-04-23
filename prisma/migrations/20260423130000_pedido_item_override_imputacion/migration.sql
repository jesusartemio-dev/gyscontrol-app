-- AlterTable: agregar override de imputación por ítem en pedido_equipo_item
-- Permite que un ítem de un PedidoEquipo se impute a un Proyecto o CentroCosto
-- distinto del pedido padre (caso: pedido interno de EPPs repartidos entre proyectos).
-- Si ambos son NULL, el ítem hereda la imputación del pedido padre.
-- Son mutuamente excluyentes: la validación se aplica en el API.
ALTER TABLE "pedido_equipo_item" ADD COLUMN "proyectoId" TEXT;
ALTER TABLE "pedido_equipo_item" ADD COLUMN "centroCostoId" TEXT;

-- AddForeignKey
ALTER TABLE "pedido_equipo_item" ADD CONSTRAINT "pedido_equipo_item_proyectoId_fkey"
    FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pedido_equipo_item" ADD CONSTRAINT "pedido_equipo_item_centroCostoId_fkey"
    FOREIGN KEY ("centroCostoId") REFERENCES "centro_costo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "idx_pedido_item_proyecto_override" ON "pedido_equipo_item"("proyectoId");
CREATE INDEX "idx_pedido_item_centro_costo_override" ON "pedido_equipo_item"("centroCostoId");
