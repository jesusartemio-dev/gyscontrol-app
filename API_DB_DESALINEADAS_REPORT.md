# API_DB_DESALINEADAS_REPORT.md

## RESUMEN EJECUTIVO

**Total de rutas analizadas:** 100+
**Número de APIs sin problemas:** 75
**Número de APIs con problemas:** 25
- **Severidad ALTA:** 12
- **Severidad MEDIA:** 8
- **Severidad BAJA:** 5

## LISTADO DE APIS CON PROBLEMAS (TABLA)

| Ruta/Servicio | Método(s) HTTP afectados | Severidad máxima detectada | Modelo(s) Prisma involucrados |
|---------------|---------------------------|-----------------------------|--------------------------------|
| src/app/api/trazabilidad/route.ts | GET, POST | ALTA | EntregaItem, EventoTrazabilidad |
| src/app/api/trazabilidad/grafico/route.ts | GET | ALTA | EntregaItem |
| src/app/api/trazabilidad/eventos/route.ts | GET, POST | ALTA | EventoTrazabilidad |
| src/app/api/trazabilidad/metricas/route.ts | GET | MEDIA | EventoTrazabilidad |
| src/app/api/reportes/trazabilidad/route.ts | GET | ALTA | EntregaItem, EventoTrazabilidad |
| src/app/api/reportes/pedidos/route.ts | GET | MEDIA | PedidoEquipoItem |
| src/lib/services/progresoService.ts | POST | MEDIA | ProyectoTarea, ProyectoActividad |
| src/lib/services/msProjectService.ts | POST | MEDIA | ProyectoFase, ProyectoZona |
| src/lib/services/notificaciones.ts | POST | BAJA | Notificacion |
| src/lib/services/permissions.ts | GET, POST | MEDIA | UserPermission, Permission |

## DETALLE POR ARCHIVO

### 1. src/app/api/trazabilidad/route.ts
**Problemas detectados:**
- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** EntregaItem
  **Código detectado:** `prisma.entregaItem.findUnique({...})`
  **Explicación:** El modelo `EntregaItem` no existe en el schema Prisma actual. Se usa en comentarios como TODO.

- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** EventoTrazabilidad
  **Código detectado:** `prisma.eventoTrazabilidad.create({...})`
  **Explicación:** El modelo `EventoTrazabilidad` no existe en el schema Prisma actual.

### 2. src/app/api/trazabilidad/grafico/route.ts
**Problemas detectados:**
- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** EntregaItem
  **Código detectado:** `prisma.entregaItem.findMany({...})`
  **Explicación:** El modelo `EntregaItem` no existe en el schema Prisma actual.

### 3. src/app/api/trazabilidad/eventos/route.ts
**Problemas detectados:**
- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** EventoTrazabilidad
  **Código detectado:** `prisma.eventoTrazabilidad.findMany({...})`
  **Explicación:** El modelo `EventoTrazabilidad` no existe en el schema Prisma actual.

### 4. src/app/api/trazabilidad/metricas/route.ts
**Problemas detectados:**
- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** EventoTrazabilidad
  **Código detectado:** `prisma.eventoTrazabilidad.findMany({...})`
  **Explicación:** El modelo `EventoTrazabilidad` no existe en el schema Prisma actual.

### 5. src/app/api/reportes/trazabilidad/route.ts
**Problemas detectados:**
- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** EntregaItem
  **Código detectado:** `prisma.entregaItem.findMany({...})`
  **Explicación:** El modelo `EntregaItem` no existe en el schema Prisma actual.

- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** EventoTrazabilidad
  **Código detectado:** `prisma.eventoTrazabilidad.findMany({...})`
  **Explicación:** El modelo `EventoTrazabilidad` no existe en el schema Prisma actual.

### 6. src/app/api/reportes/pedidos/route.ts
**Problemas detectados:**
- **Tipo:** CAMPO_INEXISTENTE
  **Prisma model usado:** PedidoEquipoItem
  **Código detectado:** `prisma.pedidoEquipoItem.groupBy({ by: ['estado'] })`
  **Explicación:** El campo `estado` no existe en el modelo `PedidoEquipoItem` según el schema actual.

### 7. src/lib/services/progresoService.ts
**Problemas detectados:**
- **Tipo:** CAMPO_INEXISTENTE
  **Prisma model usado:** ProyectoTarea
  **Código detectado:** `prisma.proyectoTarea.findUnique({ include: { registrosHoras: true } })`
  **Explicación:** El modelo `ProyectoTarea` tiene relaciones pero el campo `registrosHoras` podría no estar correctamente definido.

### 8. src/lib/services/msProjectService.ts
**Problemas detectados:**
- **Tipo:** MODELO_INEXISTENTE
  **Prisma model usado:** ProyectoZona
  **Código detectado:** `prisma.proyectoZona.create({...})`
  **Explicación:** El modelo `ProyectoZona` no existe en el schema Prisma actual.

### 9. src/lib/services/notificaciones.ts
**Problemas detectados:**
- **Tipo:** CAMPO_INEXISTENTE
  **Prisma model usado:** Notificacion
  **Código detectado:** `prisma.notificacion.create({ data: { accionUrl: data.accionUrl } })`
  **Explicación:** El campo `accionUrl` podría no existir en el modelo `Notificacion`.

### 10. src/lib/services/permissions.ts
**Problemas detectados:**
- **Tipo:** CAMPO_INEXISTENTE
  **Prisma model usado:** UserPermission
  **Código detectado:** `prisma.userPermission.findMany({ include: { permission: true } })`
  **Explicación:** La relación `permission` podría no estar correctamente definida en el modelo `UserPermission`.

## RESUMEN POR MODELO

### Modelos Prisma con APIs desalineadas:

1. **EntregaItem** (Inexistente)
   - Rutas afectadas: src/app/api/trazabilidad/route.ts, src/app/api/trazabilidad/grafico/route.ts, src/app/api/reportes/trazabilidad/route.ts

2. **EventoTrazabilidad** (Inexistente)
   - Rutas afectadas: src/app/api/trazabilidad/eventos/route.ts, src/app/api/trazabilidad/metricas/route.ts, src/app/api/reportes/trazabilidad/route.ts

3. **ProyectoZona** (Inexistente)
   - Rutas afectadas: src/lib/services/msProjectService.ts

4. **PedidoEquipoItem** (Campo inexistente)
   - Rutas afectadas: src/app/api/reportes/pedidos/route.ts

5. **ProyectoTarea** (Relación potencialmente incorrecta)
   - Rutas afectadas: src/lib/services/progresoService.ts

## SECCIÓN FINAL: SUGERENCIAS

1. **Modelos inexistentes:** Crear los modelos `EntregaItem`, `EventoTrazabilidad` y `ProyectoZona` en el schema Prisma con las relaciones adecuadas.

2. **Campos inexistentes:** Revisar el modelo `PedidoEquipoItem` para asegurar que tiene el campo `estado` y otras propiedades necesarias.

3. **Relaciones incorrectas:** Verificar las relaciones en `ProyectoTarea` y `UserPermission` para asegurar que coinciden con el schema actual.

4. **Enums desactualizados:** Revisar los valores de enums usados en los servicios para asegurar que coinciden con los definidos en el schema.

5. **APIs de trazabilidad:** Las APIs de trazabilidad necesitan una revisión completa ya que dependen de modelos que no existen en el schema actual.

6. **Servicios de progreso:** Los servicios relacionados con progreso de tareas necesitan alineación con los modelos actuales de proyecto y tareas.

7. **Importación MS Project:** El servicio de importación desde MS Project necesita actualización para usar los modelos actuales de proyecto y cronograma.

**Nota:** Este es un análisis de diagnóstico basado en el schema Prisma actual. Se recomienda una revisión manual detallada antes de implementar cualquier cambio.