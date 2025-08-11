📦 Reemplazo de ListaEquipoItem con ítem del Catálogo (2 casos posibles):

Hay 2 modales:
1. ModalReemplazarItemDesdeCatalogo.tsx → para ítems con origen "cotizado"
2. ModalReemplazarReemplazoDesdeCatalogo.tsx → para ítems con origen "reemplazo"

🔁 1. ModalReemplazarItemDesdeCatalogo (Origen: "cotizado")
      Visibilidad del botón: solo si item.origen === "cotizado"
Lógica:
✅ Si el ListaEquipoItem a reemplazar tiene proyectoEquipoItemId:
    -El nuevo ítem recibe ambos campos:
          proyectoEquipoItemId = item.proyectoEquipoItemId
          reemplazaProyectoEquipoItemId = item.proyectoEquipoItemId
   -Luego, el ProyectoEquipoItem es actualizado para incluir el nuevo ítem:
       ProyectoEquipoItem.listaEquipoSeleccionadoId = nuevoItem.id
✅ Si tiene cotización relacionada, el antiguo ListaEquipoItem:
   -cambia su estado a 'rechazado'
   -y se borra el proyectoEquipoItemId.
   -La condición se determina revisando si cotizaciones.length > 0, no solo si cotizacionSeleccionadaId está definido.
✅ Si no tiene cotizaciones relacionadas (cotizaciones.length === 0):
   -Se elimina el ListaEquipoItem.

🔁 2. ModalReemplazarReemplazoDesdeCatalogo (Origen: "reemplazo")
    Visibilidad del botón: solo si item.origen === "reemplazo"
Lógica:
✅ Si el ListaEquipoItem a reemplazar tiene reemplazaProyectoEquipoItemId:
    -El nuevo ítem también recibe ese reemplazaProyectoEquipoItemId y proyectoEquipoItemId.
    -Luego, se actualiza el ProyectoEquipoItem con:
         ProyectoEquipoItem.listaEquipoSeleccionadoId = nuevoItem.id
✅ Si tiene cotización relacionada (cotizaciones.length > 0):
  -Se cambia el estado del ítem anterior a 'rechazado'
  -y se borra el reemplazaProyectoEquipoItemId.
✅ Si no tiene cotizaciones relacionadas (cotizaciones.length === 0):
  -Se elimina el ListaEquipoItem.


🧩 ModalAgregarItemDesdeEquipo
Tipo: Cotizado (ítems provenientes de la cotización aprobada)
✅ Características:
  -Se agregan desde la entidad ProyectoEquipoItem, que representa los equipos planificados en la cotización aprobada.
  -Tienen relación directa con ProyectoEquipoItem, por lo tanto:
        ListaEquipoItem.proyectoEquipoItemId !== null
  -Son los que llamamos "de cotización" o "planificados".
  -Están disponibles para agregar mientras:
        *No hayan sido completamente cubiertos (es decir, cantidad > suma(listaEquipos.cantidad)).
        *No hayan sido reemplazados con un ítem seleccionado (ProyectoEquipoItem.listaEquipoSeleccionadoId === null o el ListaEquipoItem asociado ya fue eliminado o rechazado).
🛑 Si ya han sido reemplazados o completados, deben aparecer en gris y no seleccionables.


🧩 ModalAgregarItemDesdeCatalogo
Tipo: Nuevo (ítems agregados directamente, sin relación con cotización)
✅ Características:
  -Se agregan desde CatalogoEquipo.
  -No tienen relación con ProyectoEquipoItem, ni reemplazan ninguno existente.
  -Cumplen ambas condiciones:
        !ListaEquipoItem.proyectoEquipoItemId && !ListaEquipoItem.reemplazaProyectoEquipoItemId
  -Es decir:
        *No provienen de la cotización aprobada.
        *No están reemplazando ningún equipo planificado.
Son ítems libres y nuevos que el usuario decide añadir adicionalmente.





⚠️ 3. pedido-equipo-item/route.ts
❌ Tiene lógica adicional de negocio.
-Incremento automático en costoPedido (porcentaje).
-Lógica cruzada: actualiza estado y costoPedido de listaEquipoItem.
-Sincroniza con cotización elegida.
-Aplica reglas logísticas.
👉 Esto debería estar en el frontend (por ejemplo, cuando seleccionas un proveedor o cotización).


⚠️ 4. pedido-equipo-item/[id]/route.ts
❌ Tiene lógica adicional.
Similar a la anterior:
-Valida cambios cruzados en cotización.
-Reasigna reemplazaProyectoEquipoItemId y cotizacionSeleccionadaId.
-Actualiza otros modelos (side effects).
👉 También debería resolverse desde el frontend antes del PUT.

⚠️ 7. lista-equipo-item/route.ts
❌ Tiene lógica de negocio.
-Copia datos desde cotizacionEquipoItem.
-Inicializa tiempoEntrega, costoPedido desde ahí.
-Reasigna relaciones (proyectoEquipoItem, etc.).
👉 Debería ser responsabilidad del frontend enviar esos datos ya preparados.

⚠️ 8. lista-equipo-item/[id]/route.ts
❌ Tiene lógica cruzada.
Al actualizar:
-Cambia valores en pedidoEquipoItem según estado.
-Sincroniza cotizacionSeleccionadaId, estado, proveedorId.
👉 Hay dependencias cruzadas no deseadas en la API.



src/lib/services/pedidoEquipoItem.ts
-getPedidoEquipoItems
-getPedidoEquipoItemById
-updatePedidoEquipoItem
-deletePedidoEquipoItem
createPedidoEquipoItem: sí contiene lógica de negocio