-- AddForeignKey: PedidoEquipoItem.proveedorId -> proveedor.id
ALTER TABLE "pedido_equipo_item" ADD CONSTRAINT "PedidoEquipoItem_proveedorId_fkey"
  FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: PedidoEquipoItem.catalogoEquipoId -> catalogo_equipo.id
ALTER TABLE "pedido_equipo_item" ADD CONSTRAINT "PedidoEquipoItem_catalogoEquipoId_fkey"
  FOREIGN KEY ("catalogoEquipoId") REFERENCES "catalogo_equipo"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
