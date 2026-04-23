-- AlterTable: agregar categoriaCosto a pedido_equipo_item.
-- Define en qué bucket contable del destino (Equipos/Servicios/Gastos) se imputa
-- cuando el ítem tiene override. Null = hereda del pedido padre (ítems sin override).
-- Reutiliza el enum "CategoriaCosto" ya existente (usado por HojaDeGastos y GastoLinea).
ALTER TABLE "pedido_equipo_item" ADD COLUMN "categoriaCosto" "CategoriaCosto";
