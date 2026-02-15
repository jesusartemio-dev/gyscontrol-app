# Refactorización: Centro de Costos y Asignación Financiera

**Fecha:** 2026-02-15
**Motivación:** El proyecto ya ES el centro de costos por naturaleza. Mantener un intermediario `CentroCosto` de tipo "proyecto" agregaba complejidad sin valor. Los documentos financieros (HojaDeGastos, OrdenCompra) deben apuntar directamente al proyecto o, para gastos no vinculados a proyectos, a un centro de costo administrativo.

---

## 1. Cambios en el modelo de datos (schema.prisma)

### Nuevo enum

```prisma
enum CategoriaCosto {
  equipos
  servicios
  gastos
}
```

Representa los 3 pilares de costos de un proyecto. Validado a nivel de base de datos.

### CentroCosto - Simplificado

| Campo | Antes | Después |
|-------|-------|---------|
| `proyectoId` | `String? @unique` | **Eliminado** |
| `proyecto` (relación) | `Proyecto? @relation(...)` | **Eliminada** |
| `tipo` | `"proyecto" \| "departamento" \| "administrativo"` | `"departamento" \| "administrativo"` |
| `pedidosEquipo` (relación) | `PedidoEquipo[]` | **Eliminada** |
| `@@index([proyectoId])` | Existía | **Eliminado** |

### HojaDeGastos - Ampliado

| Campo | Antes | Después |
|-------|-------|---------|
| `proyectoId` | No existía | `String?` (nuevo, FK a Proyecto) |
| `centroCostoId` | `String` (requerido) | `String?` (ahora opcional) |
| `categoriaCosto` | No existía | `CategoriaCosto @default(gastos)` |
| `proyecto` (relación) | No existía | `Proyecto? @relation(...)` |
| Nuevos índices | - | `@@index([proyectoId, estado])`, `@@index([centroCostoId, estado])` |

**Regla:** `proyectoId` y `centroCostoId` son mutuamente excluyentes. Exactamente uno debe estar presente. Validación en API, no en schema.

### OrdenCompra - Ampliado

| Campo | Antes | Después |
|-------|-------|---------|
| `categoriaCosto` | No existía | `CategoriaCosto @default(equipos)` |

La OC ya tenía `proyectoId` y `centroCostoId` opcionales. Se agrega la misma regla de mutual exclusividad.

### PedidoEquipo - Reducido

| Campo | Antes | Después |
|-------|-------|---------|
| `centroCostoId` | `String?` (siempre null) | **Eliminado** |
| `centroCosto` (relación) | `CentroCosto? @relation(...)` | **Eliminada** |

Los pedidos de equipo siempre pertenecen a un proyecto (vía `proyectoId`). Nunca se usó `centroCostoId`.

### Proyecto - Relación ajustada

| Campo | Antes | Después |
|-------|-------|---------|
| `centroCosto` | `CentroCosto[]` (relación inversa) | **Eliminada** |
| `hojasDeGastos` | No existía | `HojaDeGastos[]` (nueva relación inversa) |

---

## 2. Cambios en APIs

### POST /api/hoja-de-gastos (crear requerimiento)

- **Mutual exclusividad**: Valida que venga `proyectoId` XOR `centroCostoId`. Error 400 si vienen ambos o ninguno.
- **Validación de existencia**: Si `proyectoId`, verifica que el proyecto existe. Si `centroCostoId`, verifica que existe y está activo.
- **categoriaCosto**: Acepta en payload, default `gastos`.

### GET /api/hoja-de-gastos (listar)

- **Nuevo filtro**: `proyectoId` como query parameter.
- **Permisos**: Para roles no-admin/gerente, el filtro OR incluye hojas donde el usuario es `empleadoId` o donde `proyecto.gestorId/supervisorId/liderId` coincide.

### POST /api/hoja-de-gastos/[id]/validar

- Al pasar a estado `validado`, si la hoja tiene `proyectoId`, recalcula:
  ```
  Proyecto.totalRealGastos = SUM(montoGastado) de HojaDeGastos
    WHERE proyectoId = X AND estado IN ('validado', 'cerrado')
  ```

### POST /api/hoja-de-gastos/[id]/cerrar

- Misma lógica de recálculo que `validar`.

### POST /api/orden-compra (crear OC)

- **Mutual exclusividad**: Misma validación que HojaDeGastos.
- **Validación de existencia**: Verifica proyecto o centro de costo.
- **categoriaCosto**: Acepta en payload, default `equipos`.

### POST/PUT /api/centro-costo

- **Tipo restringido**: Solo acepta `departamento` o `administrativo`. Rechaza `proyecto` con error 400.

---

## 3. Cambios en UI

### Componente nuevo: SelectorAsignacion

**Ubicación:** `src/components/shared/SelectorAsignacion.tsx`

Dropdown unificado con dos grupos (SelectGroup):
- **Proyectos**: Lista proyectos activos (excluye cancelados/cerrados), muestra `codigo - nombre`
- **Centros Administrativos**: Lista centros de costo activos, muestra `nombre (tipo)`

Props:
```typescript
interface SelectorAsignacionProps {
  value: { proyectoId: string | null; centroCostoId: string | null }
  onChange: (value: AsignacionValue) => void
  disabled?: boolean
  placeholder?: string
}
```

Internamente usa composite values (`p:ID` / `c:ID`) para manejar la mutual exclusividad en un solo Select.

### Formulario: Nuevo Requerimiento (`/finanzas/requerimientos/nuevo`)

| Antes | Después |
|-------|---------|
| Select "Centro de Costo" (lista CentrosCosto) | SelectorAsignacion "Asignar a" (proyectos + centros) |
| Sin categoría | Select "Categoría" (Gastos/Equipos/Servicios, default: Gastos) |

### Formulario: Nueva Orden de Compra (`/logistica/ordenes-compra/nueva`)

| Antes | Después |
|-------|---------|
| Card "Centro de Costo" (lista CentrosCosto, opcional) | Card "Asignar a" con SelectorAsignacion (requerido) + Select "Categoría" (default: Equipos) |

### Listado: Requerimientos (`/finanzas/requerimientos`)

| Columna Antes | Columna Después |
|---------------|-----------------|
| Centro de Costo | Asignado a (proyecto.codigo - nombre O centroCosto.nombre) |
| - | Categoría (nueva columna) |
| Saldo | Saldo (restaurada) |

Nuevos filtros: dropdown "Categoría" (Todas/Gastos/Equipos/Servicios).
Búsqueda ampliada: ahora busca también por proyecto.codigo y proyecto.nombre.

### Listado: Órdenes de Compra (`/logistica/ordenes-compra`)

| Columna Antes | Columna Después |
|---------------|-----------------|
| Centro de Costo | Asignado a (proyecto.codigo - nombre O centroCosto.nombre) |
| - | Categoría (nueva columna) |

Nuevos filtros: dropdown "Categoría" (Todas/Equipos/Servicios/Gastos).
Búsqueda ampliada: ahora busca también por proyecto.codigo y proyecto.nombre.

### Detalle: Requerimiento (`/finanzas/requerimientos/[id]`)

- Header badge: muestra proyecto o centro de costo en lugar de solo centroCosto.
- Info grid: nuevas filas "Asignado a" y "Categoría" al inicio.

### Detalle: Orden de Compra (`/logistica/ordenes-compra/[id]`)

- Ya mostraba proyecto y centroCosto condicionalmente. Sin cambios necesarios.

### Configuración: Centros de Costo (`/configuracion/centros-costo`)

- Dropdown de tipo: solo "Departamento" y "Administrativo" (eliminado "Proyecto").
- Tabla: eliminada columna "Proyecto".

### Service: hojaDeGastos.ts

- `getHojasDeGastos` ahora acepta `proyectoId` como parámetro de filtro.

---

## 4. Migración de datos

### Script: `scripts/migrate-centro-costo-simplify.ts`

Ejecutar con: `npx tsx scripts/migrate-centro-costo-simplify.ts`

Acciones:
1. Reporta conteos existentes de CentroCosto por tipo.
2. Cambia centros con tipo `proyecto` a tipo `administrativo`.
3. Reporta HojaDeGastos y OrdenCompra existentes y sus asignaciones.

### Datos existentes

- **HojaDeGastos anteriores**: Tienen `centroCostoId` poblado y `proyectoId = null`. Siguen funcionando correctamente: la UI muestra el centroCosto en "Asignado a". No requieren migración de datos.
- **OrdenCompra anteriores**: Pueden tener `centroCostoId` y/o `proyectoId`. Siguen funcionando.
- **CentroCosto tipo "proyecto"**: Se migran a tipo "administrativo" vía script. Si se quiere vincular hojas/OCs existentes a su proyecto real, se debe hacer manualmente (UPDATE hoja_de_gastos SET "proyectoId" = X WHERE "centroCostoId" = Y).
- **PedidoEquipo.centroCostoId**: Siempre fue null. La columna se elimina con `prisma db push`.

### Pendiente: Push a producción

```bash
# Local (ya ejecutado)
npx prisma db push

# Producción (pendiente)
npx dotenv -e .env.production -- npx prisma db push
npx dotenv -e .env.production -- npx tsx scripts/migrate-centro-costo-simplify.ts
```

---

## 5. Reglas de negocio nuevas

### Mutual exclusividad: proyectoId XOR centroCostoId

Aplica a: **HojaDeGastos**, **OrdenCompra**

- Al crear, exactamente uno debe estar presente.
- Si seleccionas un proyecto, `centroCostoId` queda `null` y viceversa.
- Validado en API (error 400) y en UI (SelectorAsignacion impone la exclusividad por diseño).

### CategoriaCosto

Aplica a: **HojaDeGastos** (default: `gastos`), **OrdenCompra** (default: `equipos`)

Los 3 valores posibles (`equipos`, `servicios`, `gastos`) representan los pilares de costos de un proyecto. Es un enum Prisma, validado a nivel de base de datos.

### Recálculo de Proyecto.totalRealGastos

**Trigger:** Cuando una HojaDeGastos con `proyectoId` llega a estado `validado` o `cerrado`.

**Fórmula:**
```sql
Proyecto.totalRealGastos = SUM(HojaDeGastos.montoGastado)
  WHERE proyectoId = :id AND estado IN ('validado', 'cerrado')
```

**Importante:** `totalRealGastos` viene exclusivamente de HojaDeGastos.montoGastado, NO de ProyectoGastoCotizado.costoReal. Esto evita doble conteo entre datos presupuestarios y datos de ejecución.

### CentroCosto: tipo "proyecto" prohibido

La API rechaza crear o actualizar un CentroCosto con tipo `proyecto`. Solo se permiten `departamento` y `administrativo`. Los proyectos ya no necesitan un CentroCosto intermediario.

### PedidoEquipo: sin centro de costo

Los pedidos de equipo siempre pertenecen a un proyecto directamente (vía `proyectoId`). No tienen ni necesitan vinculación a CentroCosto.

---

## Archivos modificados (resumen)

```
prisma/schema.prisma                                    # Schema: enum, campos, relaciones
scripts/migrate-centro-costo-simplify.ts                # Script de migración
src/types/modelos.ts                                    # Tipos TS
src/types/payloads.ts                                   # Payloads TS

src/app/api/hoja-de-gastos/route.ts                     # POST: mutual exclusivity, GET: filtro proyectoId
src/app/api/hoja-de-gastos/[id]/route.ts                # includeRelations actualizado
src/app/api/hoja-de-gastos/[id]/validar/route.ts        # Recálculo totalRealGastos
src/app/api/hoja-de-gastos/[id]/cerrar/route.ts         # Recálculo totalRealGastos
src/app/api/orden-compra/route.ts                       # POST: mutual exclusivity + categoriaCosto
src/app/api/orden-compra/[id]/route.ts                  # includeRelations actualizado
src/app/api/orden-compra/[id]/recepcion/route.ts        # includeRelations actualizado
src/app/api/centro-costo/route.ts                       # POST: tipo restringido
src/app/api/centro-costo/[id]/route.ts                  # PUT: tipo restringido
src/app/api/gasto-adjunto/route.ts                      # Folder logic: hoja-based

src/components/shared/SelectorAsignacion.tsx             # NUEVO: dropdown unificado
src/lib/services/hojaDeGastos.ts                        # proyectoId en params
src/app/finanzas/requerimientos/nuevo/page.tsx           # Form: SelectorAsignacion + categoriaCosto
src/app/finanzas/requerimientos/page.tsx                 # Lista: Asignado a + filtro categoría
src/app/finanzas/requerimientos/[id]/page.tsx            # Detalle: Asignado a + Categoría
src/app/logistica/ordenes-compra/nueva/page.tsx          # Form: SelectorAsignacion + categoriaCosto
src/app/logistica/ordenes-compra/page.tsx                # Lista: Asignado a + filtro categoría
src/app/configuracion/centros-costo/page.tsx             # Config: sin tipo proyecto, sin col proyecto
```
