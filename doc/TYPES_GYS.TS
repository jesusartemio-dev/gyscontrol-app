enum EstadoEquipo {
  pendiente
  revisado_tecnico
  aprobado_coordinador
  aprobado_gestor
  en_lista
  comprado
  reemplazado
  entregado
}

enum EstadoEquipoItem {
  pendiente // Aún no ha sido considerado en ninguna lista
  en_lista // Ha sido seleccionado e incluido en una lista
  reemplazado // Fue reemplazado por otro equipo (pero existía en la planificación original)
  descartado // Se decidió no usar este equipo
}

enum EstadoListaItem {
  de_cotizacion // Proviene de un ProyectoEquipoItem
  nuevo // Fue añadido directamente (no planificado)
  reemplazo // Reemplaza un equipo planificado
}

enum EstadoListaEquipo {
  borrador
  por_revisar
  por_cotizar
  por_validar
  por_aprobar
  aprobado
  rechazado
}

model ProyectoEquipo {
  id              String               @id @default(cuid())
  proyectoId      String
  responsableId   String
  nombre          String
  descripcion     String?
  subtotalInterno Float
  subtotalCliente Float
  subtotalReal    Float                @default(0)
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  proyecto        Proyecto             @relation(fields: [proyectoId], references: [id])
  responsable     User                 @relation(fields: [responsableId], references: [id])
  items           ProyectoEquipoItem[]
  listaItems      ListaEquipoItem[] // 🔁 Relación inversa
}

model ProyectoEquipoItem {
  id               String  @id @default(cuid())
  proyectoEquipoId String
  catalogoEquipoId String?
  listaId          String?
  equipoOriginalId String? // 🔁 Si este ítem reemplaza a otro

  codigo      String
  descripcion String
  categoria   String @default("SIN-CATEGORIA")
  unidad      String
  marca       String @default("SIN-MARCA")

  precioInterno Float
  precioCliente Float
  cantidad      Float
  costoInterno  Float
  costoCliente  Float

  precioReal   Float @default(0)
  cantidadReal Float @default(0)
  costoReal    Float @default(0)

  tiempoEntrega        Int?
  fechaEntregaEstimada DateTime?

  estado       EstadoEquipoItem @default(pendiente)
  aprobado     Boolean          @default(false)
  motivoCambio String?
  nuevo        Boolean          @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 🔁 Relaciones
  equipoOriginal      ProyectoEquipoItem?  @relation("Reemplazo", fields: [equipoOriginalId], references: [id])
  reemplazos          ProyectoEquipoItem[] @relation("Reemplazo")
  reemplazadoPorLista ListaEquipoItem[]    @relation("ReemplazoPEI")

  listaEquipos   ListaEquipoItem[]
  catalogoEquipo CatalogoEquipo?   @relation(fields: [catalogoEquipoId], references: [id])
  lista          ListaEquipo?      @relation(fields: [listaId], references: [id])
  proyectoEquipo ProyectoEquipo    @relation(fields: [proyectoEquipoId], references: [id], onDelete: Cascade)
}


model ListaEquipo {
  id                  String               @id @default(cuid())
  proyectoId          String
  codigo              String               @unique // ← antes 'nombre', ahora es el código único por proyecto
  nombre              String // ← nuevo campo obligatorio (reemplaza a 'descripcion')
  numeroSecuencia     Int // ← número crudo usado para construir el código (ej. 1 → LST-001)
  estado              EstadoListaEquipo    @default(borrador)
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  proyecto            Proyecto             @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  items               ListaEquipoItem[]
  proyectoEquipoItems ProyectoEquipoItem[]
  PedidoEquipos       PedidoEquipo[]
}

model ListaEquipoItem {
  id                       String  @id @default(cuid())
  listaId                  String
  proyectoEquipoId         String?
  proyectoEquipoItemId     String?
  proveedorId              String?
  cotizacionSeleccionadaId String? @unique

  reemplazaAId String?

  codigo             String
  descripcion        String
  unidad             String
  cantidad           Float
  verificado         Boolean         @default(false)
  comentarioRevision String?
  presupuesto        Float?
  precioElegido      Float?
  costoElegido       Float?
  costoPedido        Float?          @default(0)
  costoReal          Float?          @default(0)
  cantidadPedida     Float?          @default(0)
  cantidadEntregada  Float?          @default(0)
  estado             EstadoListaItem @default(de_cotizacion)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cotizacionSeleccionada CotizacionProveedorItem? @relation("SeleccionCotizacion", fields: [cotizacionSeleccionadaId], references: [id])
  proveedor              Proveedor?               @relation(fields: [proveedorId], references: [id])
  lista                  ListaEquipo              @relation(fields: [listaId], references: [id], onDelete: Cascade)
  proyectoEquipo         ProyectoEquipo?          @relation(fields: [proyectoEquipoId], references: [id])
  proyectoEquipoItem     ProyectoEquipoItem?      @relation(fields: [proyectoEquipoItemId], references: [id])
  reemplazaA             ProyectoEquipoItem?      @relation("ReemplazoPEI", fields: [reemplazaAId], references: [id])

  cotizaciones CotizacionProveedorItem[]
  pedidos      PedidoEquipoItem[]
}

Actualmente tenemos 3 modales:
-ModalAgregarItemDesdeEquipo
-ModalAgregarItemDesdeCatalogo
-ProyectoReemplazarItemListaModal

Pero deberiamos tener 4 modales
-ModalAgregarItemDesdeEquipo: agrega un nuevo equipo a la lista ListaEquipoItem y pone Origen como "cotizado"
-ModalAgregarItemDesdeCatalogo:agrega un nuevo equipo a la lista ListaEquipoItem y pone Origen como "nuevo"
-ModalReemplazarItemDesdeCatalogo: reemplaza el equipo con uno nuevo desde catagolo y pone como origen "reemplazo"
-ModalReemplazarReemplazoDesdeCatalogo: reemplaza el equipo con uno nuevo desde catagolo y pone como origen "reemplazo"

actualmente tenemos EstadoListaItem:
enum EstadoListaItem {
  de_cotizacion // Proviene de un ProyectoEquipoItem
  nuevo // Fue añadido directamente (no planificado)
  reemplazo // Reemplaza un equipo planificado
}
Pero este no refleja el estado como queremos, en lugar deberiamos tener el estado de la sigueinte manera:

enum EstadoListaItem {
  borrador
  por_revisar
  por_cotizar
  por_validar
  por_aprobar
  aprobado
  rechazado
}
y crear un nuevo tipo de datos enum com:
enum OrigenListaItem {
  cotizado // Proviene de un ProyectoEquipoItem
  nuevo // Fue añadido directamente (no planificado)
  reemplazo // Reemplaza un equipo planificado
}

con este OrigenListaItem podemos distinguir entre los diferentes tipos de ítems en la lista de equipos 
y de acuerdo a eso podemos distinguir los sigueintes origenes

ModalAgregarItemDesdeEquipo, 
Cotizado: desde ProyectoEquipoItem
1. Relacionados con ProyectoEquipoItem
→ Son ítems que se jala de la cotización aprobada
→ Tienen proyectoEquipoItemId
→ Son los que llamamos "de cotización"
→ 

Nuevo: desde CatalogoEquipo
→ Agregados directamente desde catálogo CatalogoEquipo
→ No tienen proyectoEquipoItemId
→ No tienen reemplazaAId
→ Es decir: !ListaEquipoItem.proyectoEquipoItemId && !ListaEquipoItem.reemplazaAId

Reemplazo: desde CatalogoEquipo hay deberia haber 2 modales "ModalReemplazarItemDesdeCatalogo" y "ModalReemplazarReemplazoDesdeCatalogo"
-ModalReemplazarCotizado el boton es visible cuando el OrigenListaItem de ListaEquipoItem es "cotizado"
→ Si el antiguo ListaEquipoItem tiene proyectoEquipoItemId copia el id al nuevo reemplazaAId y en ProyectoEquipoItem se actualiza equipoOriginalId
→ Si el antiguo ListaEquipoItem tiene cotizacion relacionada entonces se borra el proyectoEquipoItemId y pasa su estado (EstadoListaItem) a "rechazado" 
→ Si el antiguo ListaEquipoItem no tiene cotizacion relacionada entonces se elimina el antiguo ListaEquipoItem

-ModalReemplazarReemplazoDesdeCatalogo el boton es visible cuando el OrigenListaItem de ListaEquipoItem es "reemplazo"
→ Si el antiguo ListaEquipoItem tiene el reemplazaAId copia reemplazaAId al nuevo reemplazaAId  y en ProyectoEquipoItem se actualiza equipoOriginalId
→ Si el antiguo ListaEquipoItem tiene cotizacion relacionada entonces se borra el reemplazaAId y pasa su estado (EstadoListaItem) a "rechazado" 
→ Si el antiguo ListaEquipoItem no tiene cotizacion relacionada entonces se elimina el antiguo ListaEquipoItem
  
→ Si tiene OrigenListaItem como "cotizado" copia el  id de ProyectoEquipoItem a reemplazaAId
→ Si tiene OrigenListaItem como "reemplazo", copia reemplazaAId al nuevo reemplazaAId


enum EstadoListaItem {
  de_cotizacion // Proviene de un ProyectoEquipoItem
  nuevo // Fue añadido directamente (no planificado)
  reemplazo // Reemplaza un equipo planificado
}

enum EstadoListaEquipo {
  borrador
  por_revisar
  por_cotizar
  por_validar
  por_aprobar
  aprobado
  rechazado
}

enum OrigenListaItem {
  cotizado // Proviene de un ProyectoEquipoItem
  nuevo // Fue añadido directamente (no planificado)
  reemplazo // Reemplaza un equipo planificado
}