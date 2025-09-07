# 🗄️ Mapeo de Relaciones de Base de Datos - Sistema de Aprovisionamiento

## 🎯 Resumen Ejecutivo

Este documento mapea todas las relaciones de base de datos que se verán afectadas con la eliminación del sistema de aprovisionamiento. Se han identificado **5 modelos principales** con **23 relaciones** que deben ser eliminadas de forma ordenada para evitar errores de integridad referencial.

**Fecha de análisis:** $(Get-Date -Format "yyyy-MM-dd")
**Estado:** Mapeo completo para FASE 1 - Preparación
**Modelos afectados:** 5 modelos principales + 8 modelos relacionados
**Relaciones identificadas:** 23 relaciones directas + indirectas

---

## 📊 Modelos a Eliminar

### 1. **OrdenCompra** 📋
```prisma
model OrdenCompra {
  id                      String                @id @default(cuid())
  numero                  String                @unique
  pedidoEquipoId          String?
  proveedorId             String
  estado                  EstadoOrdenCompra     @default(BORRADOR)
  fechaCreacion           DateTime              @default(now())
  fechaRequerida          DateTime
  fechaEntrega            DateTime?
  montoTotal              Decimal               @db.Decimal(12, 2)
  moneda                  String                @default("PEN")
  terminosEntrega         String?
  condicionesPago         String?
  observaciones           String?
  creadoPorId             String
  responsableAprobacionId String?
  fechaAprobacion         DateTime?
  fechaSeguimiento        DateTime?
  prioridad               PrioridadOrden        @default(NORMAL)
  updatedAt               DateTime              @updatedAt

  // RELACIONES QUE SE ELIMINARÁN:
  usuario            User                @relation("OrdenCompraCreador", fields: [creadoPorId], references: [id])
  aprobador          User?               @relation("OrdenCompraAprobador", fields: [responsableAprobacionId], references: [id])
  pedidoEquipo       PedidoEquipo?       @relation(fields: [pedidoEquipoId], references: [id])
  proveedor          Proveedor           @relation(fields: [proveedorId], references: [id])
  items              OrdenCompraItem[]   // CASCADE DELETE
  pagos              Pago[]              // CASCADE DELETE
  recepciones        Recepcion[]         // CASCADE DELETE
}
```

### 2. **OrdenCompraItem** 📦
```prisma
model OrdenCompraItem {
  id                 String            @id @default(cuid())
  ordenCompraId      String
  pedidoEquipoItemId String?
  cantidad           Int
  precioUnitario     Decimal           @db.Decimal(10, 2)
  subtotal           Decimal           @db.Decimal(12, 2)
  especificaciones   String?
  createdAt          DateTime          @default(now())
  productoId         String
  updatedAt          DateTime          @updatedAt

  // RELACIONES QUE SE ELIMINARÁN:
  ordenCompra        OrdenCompra       @relation(fields: [ordenCompraId], references: [id], onDelete: Cascade)
  producto           Producto          @relation(fields: [productoId], references: [id])
  pagoItems          PagoItem[]        // CASCADE DELETE
  recepcionItems     RecepcionItem[]   // CASCADE DELETE
}
```

### 3. **Recepcion** 📥
```prisma
model Recepcion {
  id                        String           @id @default(cuid())
  numero                    String           @unique
  ordenCompraId             String
  fechaRecepcion            DateTime         @default(now())
  estado                    EstadoRecepcion  @default(PENDIENTE)
  tipoRecepcion             TipoRecepcion    @default(NORMAL)
  responsableRecepcionId    String
  responsableInspeccionId   String?
  estadoInspeccion          EstadoInspeccion @default(PENDIENTE)
  fechaInspeccion           DateTime?
  observaciones             String?
  documentos                String?
  createdAt                 DateTime         @default(now())
  updatedAt                 DateTime         @updatedAt

  // RELACIONES QUE SE ELIMINARÁN:
  ordenCompra               OrdenCompra      @relation(fields: [ordenCompraId], references: [id], onDelete: Cascade)
  responsableRecepcion      User             @relation("RecepcionResponsable", fields: [responsableRecepcionId], references: [id])
  responsableInspeccion     User?            @relation("RecepcionInspector", fields: [responsableInspeccionId], references: [id])
  items                     RecepcionItem[]  // CASCADE DELETE
}
```

### 4. **RecepcionItem** 📋
```prisma
model RecepcionItem {
  id                String           @id @default(cuid())
  recepcionId       String
  ordenCompraItemId String
  cantidadRecibida  Int
  cantidadAceptada  Int
  cantidadRechazada Int              @default(0)
  estadoInspeccion  EstadoInspeccion @default(PENDIENTE)
  observaciones     String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // RELACIONES QUE SE ELIMINARÁN:
  ordenCompraItem   OrdenCompraItem  @relation(fields: [ordenCompraItemId], references: [id])
  recepcion         Recepcion        @relation(fields: [recepcionId], references: [id], onDelete: Cascade)
}
```

### 5. **Pago** 💰
```prisma
model Pago {
  id                      String     @id @default(cuid())
  numero                  String     @unique
  ordenCompraId           String
  recepcionId             String?
  tipo                    TipoPago   @default(CONTADO)
  estado                  EstadoPago @default(PENDIENTE)
  monto                   Decimal    @db.Decimal(12, 2)
  moneda                  String     @default("PEN")
  fechaPago               DateTime
  fechaVencimiento        DateTime?
  metodoPago              String
  entidadFinanciera       String?
  referenciaPago          String?
  observaciones           String?
  responsableAprobacionId String?
  createdAt               DateTime   @default(now())
  updatedAt               DateTime   @updatedAt

  // RELACIONES QUE SE ELIMINARÁN:
  ordenCompra        OrdenCompra @relation(fields: [ordenCompraId], references: [id], onDelete: Cascade)
  recepcion          Recepcion?  @relation(fields: [recepcionId], references: [id])
  aprobador          User?       @relation("PagoAprobador", fields: [responsableAprobacionId], references: [id])
  items              PagoItem[]  // CASCADE DELETE
}
```

### 6. **PagoItem** 💳
```prisma
model PagoItem {
  id                String           @id @default(cuid())
  pagoId            String
  ordenCompraItemId String?
  concepto          String
  monto             Decimal          @db.Decimal(10, 2)
  moneda            String           @default("PEN")
  observaciones     String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  // RELACIONES QUE SE ELIMINARÁN:
  ordenCompraItem   OrdenCompraItem? @relation(fields: [ordenCompraItemId], references: [id])
  pago              Pago             @relation(fields: [pagoId], references: [id], onDelete: Cascade)
}
```

---

## 🔗 Análisis de Relaciones por Modelo

### **OrdenCompra - 7 Relaciones**

#### Relaciones Entrantes (FK hacia OrdenCompra):
1. **OrdenCompraItem.ordenCompraId** → OrdenCompra.id `onDelete: Cascade`
2. **Recepcion.ordenCompraId** → OrdenCompra.id `onDelete: Cascade`
3. **Pago.ordenCompraId** → OrdenCompra.id `onDelete: Cascade`

#### Relaciones Salientes (FK desde OrdenCompra):
4. **OrdenCompra.creadoPorId** → User.id
5. **OrdenCompra.responsableAprobacionId** → User.id
6. **OrdenCompra.pedidoEquipoId** → PedidoEquipo.id
7. **OrdenCompra.proveedorId** → Proveedor.id

### **OrdenCompraItem - 4 Relaciones**

#### Relaciones Entrantes (FK hacia OrdenCompraItem):
1. **RecepcionItem.ordenCompraItemId** → OrdenCompraItem.id
2. **PagoItem.ordenCompraItemId** → OrdenCompraItem.id

#### Relaciones Salientes (FK desde OrdenCompraItem):
3. **OrdenCompraItem.ordenCompraId** → OrdenCompra.id `onDelete: Cascade`
4. **OrdenCompraItem.productoId** → Producto.id

### **Recepcion - 4 Relaciones**

#### Relaciones Entrantes (FK hacia Recepcion):
1. **RecepcionItem.recepcionId** → Recepcion.id `onDelete: Cascade`
2. **Pago.recepcionId** → Recepcion.id (opcional)

#### Relaciones Salientes (FK desde Recepcion):
3. **Recepcion.ordenCompraId** → OrdenCompra.id `onDelete: Cascade`
4. **Recepcion.responsableRecepcionId** → User.id
5. **Recepcion.responsableInspeccionId** → User.id (opcional)

### **RecepcionItem - 2 Relaciones**

#### Relaciones Salientes (FK desde RecepcionItem):
1. **RecepcionItem.recepcionId** → Recepcion.id `onDelete: Cascade`
2. **RecepcionItem.ordenCompraItemId** → OrdenCompraItem.id

### **Pago - 4 Relaciones**

#### Relaciones Entrantes (FK hacia Pago):
1. **PagoItem.pagoId** → Pago.id `onDelete: Cascade`

#### Relaciones Salientes (FK desde Pago):
2. **Pago.ordenCompraId** → OrdenCompra.id `onDelete: Cascade`
3. **Pago.recepcionId** → Recepcion.id (opcional)
4. **Pago.responsableAprobacionId** → User.id (opcional)

### **PagoItem - 2 Relaciones**

#### Relaciones Salientes (FK desde PagoItem):
1. **PagoItem.pagoId** → Pago.id `onDelete: Cascade`
2. **PagoItem.ordenCompraItemId** → OrdenCompraItem.id (opcional)

---

## 🚨 Modelos Afectados Indirectamente

### **User** - 6 Relaciones de Aprovisionamiento
```prisma
model User {
  // ... campos existentes ...
  
  // RELACIONES QUE SE ELIMINARÁN:
  ordenesCompraCreadas      OrdenCompra[] @relation("OrdenCompraCreador")
  ordenesCompraAprobadas    OrdenCompra[] @relation("OrdenCompraAprobador")
  recepcionesResponsable    Recepcion[]   @relation("RecepcionResponsable")
  recepcionesInspector      Recepcion[]   @relation("RecepcionInspector")
  pagosAprobados            Pago[]        @relation("PagoAprobador")
}
```

### **Proveedor** - 1 Relación
```prisma
model Proveedor {
  // ... campos existentes ...
  
  // RELACIÓN QUE SE ELIMINARÁ:
  ordenesCompra  OrdenCompra[]
}
```

### **PedidoEquipo** - 1 Relación
```prisma
model PedidoEquipo {
  // ... campos existentes ...
  
  // RELACIÓN QUE SE ELIMINARÁ:
  ordenesCompra  OrdenCompra[]
}
```

### **PedidoEquipoItem** - 1 Campo Afectado
```prisma
model PedidoEquipoItem {
  // ... campos existentes ...
  
  // CAMPO QUE SE ELIMINARÁ:
  fechaOrdenCompraRecomendada DateTime?
  
  // RELACIÓN QUE SE ELIMINARÁ:
  ordenCompraItems            OrdenCompraItem[]
}
```

### **Producto** - 1 Relación
```prisma
model Producto {
  // ... campos existentes ...
  
  // RELACIÓN QUE SE ELIMINARÁ:
  ordenCompraItems  OrdenCompraItem[]
}
```

---

## 📋 Enums a Eliminar

### **Estados y Tipos**
```prisma
// ENUMS QUE SE ELIMINARÁN COMPLETAMENTE:
enum EstadoOrdenCompra {
  BORRADOR
  ENVIADA
  APROBADA
  RECHAZADA
  COMPLETADA
  CANCELADA
}

enum EstadoRecepcion {
  PENDIENTE
  PARCIAL
  COMPLETA
  RECHAZADA
  DEVOLUCION
}

enum TipoRecepcion {
  NORMAL
  URGENTE
  DEVOLUCION
  EMERGENCIA
}

enum EstadoInspeccion {
  PENDIENTE
  APROBADA
  RECHAZADA
  CONDICIONAL
  REQUERIDA
}

enum TipoPago {
  CONTADO
  CREDITO_30
  CREDITO_60
  CREDITO_90
  TRANSFERENCIA
  CHEQUE
}

enum EstadoPago {
  PENDIENTE
  PROCESADO
  COMPLETADO
  CANCELADO
  RECHAZADO
}

enum PrioridadOrden {
  BAJA
  NORMAL
  ALTA
  URGENTE
  CRITICA
}
```

---

## 🔄 Orden de Eliminación Recomendado

### **FASE 1: Preparación**
1. ✅ Backup completo de base de datos
2. ✅ Documentación de relaciones
3. ⏳ Verificación de datos en producción
4. ⏳ Migración de datos críticos (si aplica)

### **FASE 2: Eliminación de Datos**
```sql
-- Orden específico para evitar errores de FK:
1. DELETE FROM pago_item;
2. DELETE FROM recepcion_item;
3. DELETE FROM pago;
4. DELETE FROM recepcion;
5. DELETE FROM orden_compra_item;
6. DELETE FROM orden_compra;
```

### **FASE 3: Eliminación de Tablas**
```sql
-- Orden específico para DROP TABLE:
1. DROP TABLE pago_item;
2. DROP TABLE recepcion_item;
3. DROP TABLE pago;
4. DROP TABLE recepcion;
5. DROP TABLE orden_compra_item;
6. DROP TABLE orden_compra;
```

### **FASE 4: Limpieza de Relaciones**
```prisma
-- Actualizar modelos afectados:
1. Remover relaciones de User
2. Remover relaciones de Proveedor
3. Remover relaciones de PedidoEquipo
4. Remover campo fechaOrdenCompraRecomendada de PedidoEquipoItem
5. Remover relaciones de Producto
```

### **FASE 5: Eliminación de Enums**
```sql
-- Eliminar enums (PostgreSQL):
1. DROP TYPE "EstadoOrdenCompra";
2. DROP TYPE "EstadoRecepcion";
3. DROP TYPE "TipoRecepcion";
4. DROP TYPE "EstadoInspeccion";
5. DROP TYPE "TipoPago";
6. DROP TYPE "EstadoPago";
7. DROP TYPE "PrioridadOrden";
```

---

## ⚠️ Consideraciones Críticas

### **1. Integridad Referencial**
- **Constraint Violations**: Eliminar en orden correcto para evitar errores FK
- **Cascade Deletes**: Aprovechar `onDelete: Cascade` donde esté configurado
- **Orphaned Records**: Verificar que no queden registros huérfanos

### **2. Datos en Producción**
- **Verificar existencia** de datos antes de eliminar
- **Backup específico** de tablas de aprovisionamiento
- **Plan de rollback** en caso de problemas

### **3. Índices y Constraints**
```sql
-- Índices que se eliminarán automáticamente:
- orden_compra_proveedorId_estado_idx
- orden_compra_fechaCreacion_estado_idx
- orden_compra_numero_idx
- orden_compra_prioridad_estado_idx
- orden_compra_item_productoId_idx
- recepcion_ordenCompraId_estado_idx
- recepcion_fechaRecepcion_estado_idx
- recepcion_numero_idx
- pago_ordenCompraId_estado_idx
- pago_fechaPago_estado_idx
- pago_numero_idx
```

### **4. Migraciones Prisma**
```bash
# Generar migración de eliminación:
npx prisma migrate dev --name "remove-aprovisionamiento-system"

# Aplicar en producción:
npx prisma migrate deploy
```

---

## 🛠️ Scripts de Verificación

### **Verificar Datos Existentes**
```sql
-- Contar registros en cada tabla:
SELECT 'orden_compra' as tabla, COUNT(*) as registros FROM orden_compra
UNION ALL
SELECT 'orden_compra_item', COUNT(*) FROM orden_compra_item
UNION ALL
SELECT 'recepcion', COUNT(*) FROM recepcion
UNION ALL
SELECT 'recepcion_item', COUNT(*) FROM recepcion_item
UNION ALL
SELECT 'pago', COUNT(*) FROM pago
UNION ALL
SELECT 'pago_item', COUNT(*) FROM pago_item;
```

### **Verificar Relaciones FK**
```sql
-- Verificar constraints de FK:
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN (
    'orden_compra', 'orden_compra_item', 
    'recepcion', 'recepcion_item', 
    'pago', 'pago_item'
  );
```

---

## 📊 Resumen de Impacto

### **Tablas Eliminadas**: 6
- `orden_compra`
- `orden_compra_item`
- `recepcion`
- `recepcion_item`
- `pago`
- `pago_item`

### **Relaciones Eliminadas**: 23
- 15 relaciones directas entre modelos de aprovisionamiento
- 8 relaciones con modelos externos (User, Proveedor, etc.)

### **Enums Eliminados**: 7
- `EstadoOrdenCompra`
- `EstadoRecepcion`
- `TipoRecepcion`
- `EstadoInspeccion`
- `TipoPago`
- `EstadoPago`
- `PrioridadOrden`

### **Índices Eliminados**: 11
- Índices automáticos por FK y campos únicos
- Índices compuestos para performance

---

## 🎯 Próximos Pasos

### **Inmediatos (FASE 1)**:
1. ✅ Mapeo de relaciones completado
2. ⏳ Verificar datos en producción
3. ⏳ Revisar imports/exports afectados
4. ⏳ Identificar tests que fallarán

### **Siguientes Fases**:
- **FASE 2**: Migración de datos críticos
- **FASE 3**: Eliminación ordenada de tablas
- **FASE 4**: Limpieza de relaciones en modelos
- **FASE 5**: Eliminación de enums
- **FASE 6**: Verificación de integridad

---

*Documento generado para FASE 1 - Mapeo de Relaciones BD*  
*Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")*  
*Estado: Mapeo Completo - 6 modelos, 23 relaciones identificadas*  
*Próximo paso: Verificación de datos en producción*