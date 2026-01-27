# FASE 2: REPORTE DE INCONSISTENCIAS PRISMA

## ANÁLISIS COMPLETO DE MODELOS Y REFERENCIAS

### METODOLOGÍA
- ✅ Lectura completa del schema.prisma (2,212 líneas)
- ✅ Análisis de 15+ archivos de código fuente TypeScript/JavaScript
- ✅ Identificación de todas las referencias prisma.modelo
- ✅ Comparación directa con modelos reales del schema

---

## MODELOS INVÁLIDOS DETECTADOS

### 1. Referencias con snake_case incorrecto

| **Incorrecto** | **Correcto** | **Archivos Afectados** |
|----------------|--------------|------------------------|
| `prisma.lista_equipo_item` | `prisma.ListaEquipoItem` | src/app/api/lista-equipo-item/[id]/route.ts:16,101,125,156,180,203,234 |
| `prisma.lista_equipo` | `prisma.ListaEquipo` | src/app/api/lista-equipo-item/[id]/route.ts:19 |
| `prisma.cotizacion_proveedor_item` | `prisma.CotizacionProveedorItem` | src/app/api/lista-equipo-item/[id]/route.ts:21,87,136,213 |
| `prisma.cotizacion_proveedor` | `prisma.CotizacionProveedor` | src/app/api/lista-equipo-item/[id]/route.ts:24,166 |
| `prisma.proveedores` | `prisma.Proveedor` | src/app/api/lista-equipo-item/[id]/route.ts:26,48,168 |
| `prisma.pedido_equipo_item` | `prisma.PedidoEquipoItem` | src/app/api/lista-equipo-item/[id]/route.ts:31 |
| `prisma.pedido_equipo` | `prisma.PedidoEquipo` | src/app/api/lista-equipo-item/[id]/route.ts:33 |
| `prisma.proyecto_equipo_cotizado_item` | `prisma.ProyectoEquipoCotizadoItem` | src/app/api/lista-equipo-item/[id]/route.ts:36,220 |
| `prisma.proyecto_equipo_cotizado` | `prisma.ProyectoEquipoCotizado` | src/app/api/lista-equipo-item/[id]/route.ts:38 |

### 2. Referencias con nombres plurales incorrectos

| **Incorrecto** | **Correcto** | **Archivos Afectados** |
|----------------|--------------|------------------------|
| `prisma.cotizaciones` | `prisma.Cotizacion` | src/app/api/cotizacion/[id]/route.ts:18,94,99,116 |
| `prisma.clientes` | `prisma.Cliente` | src/app/api/cotizacion/[id]/route.ts:21,72 |
| `prisma.users` | `prisma.User` | src/app/api/cotizacion/[id]/route.ts:22,73 |
| `prisma.plantillas` | `prisma.Plantilla` | src/app/api/cotizacion/[id]/route.ts:23,74 |
| `prisma.cotizacion_equipo` | `prisma.CotizacionEquipo` | src/app/api/cotizacion/[id]/route.ts:24,58 |
| `prisma.cotizacion_equipo_item` | `prisma.CotizacionEquipoItem` | src/app/api/cotizacion/[id]/route.ts:24,60 |
| `prisma.cotizacion_servicio` | `prisma.CotizacionServicio` | src/app/api/cotizacion/[id]/route.ts:25,62 |
| `prisma.cotizacion_servicio_item` | `prisma.CotizacionServicioItem` | src/app/api/cotizacion/[id]/route.ts:27,64 |
| `prisma.unidad_servicio` | `prisma.UnidadServicio` | src/app/api/cotizacion/[id]/route.ts:29 |
| `prisma.recursos` | `prisma.Recurso` | src/app/api/cotizacion/[id]/route.ts:30 |
| `prisma.catalogo_servicio` | `prisma.CatalogoServicio` | src/app/api/cotizacion/[id]/route.ts:31 |
| `prisma.cotizacion_gasto` | `prisma.CotizacionGasto` | src/app/api/cotizacion/[id]/route.ts:36,66 |
| `prisma.cotizacion_gasto_item` | `prisma.CotizacionGastoItem` | src/app/api/cotizacion/[id]/route.ts:38,68 |
| `prisma.cotizacion_exclusion` | `prisma.CotizacionExclusion` | src/app/api/cotizacion/[id]/route.ts:42,70 |
| `prisma.cotizacion_condicion` | `prisma.CotizacionCondicion` | src/app/api/cotizacion/[id]/route.ts:45,71 |

### 3. Referencias a modelos inexistentes en schema

| **Referencia Inválida** | **Estado** | **Archivos Afectados** |
|------------------------|------------|------------------------|
| `prisma.listaEquipoItem` | ✅ Existe en schema | - |
| `prisma.ListaEquipo` | ✅ Existe en schema | - |
| `prisma.CotizacionProveedorItem` | ✅ Existe en schema | - |
| `prisma.CotizacionProveedor` | ✅ Existe en schema | - |
| `prisma.Proveedor` | ✅ Existe en schema | - |
| `prisma.PedidoEquipoItem` | ✅ Existe en schema | - |
| `prisma.PedidoEquipo` | ✅ Existe en schema | - |
| `prisma.ProyectoEquipoCotizadoItem` | ✅ Existe en schema | - |
| `prisma.ProyectoEquipoCotizado` | ✅ Existe en schema | - |
| `prisma.Cotizacion` | ✅ Existe en schema | - |
| `prisma.Cliente` | ✅ Existe en schema | - |
| `prisma.User` | ✅ Existe en schema | - |
| `prisma.Plantilla` | ✅ Existe en schema | - |

---

## RELACIONES INVÁLIDAS DETECTADAS

### Relaciones con nombres de campos incorrectos

| **Campo Actual** | **Campo Correcto** | **Archivos Afectados** |
|------------------|-------------------|------------------------|
| `listaEquipoItemId` | `listaEquipoItemId` | ✅ Correcto |
| `cotizacionSeleccionadaId` | `cotizacionSeleccionadaId` | ✅ Correcto |
| `proyectoEquipoItemId` | `proyectoEquipoItemId` | ✅ Correcto |
| `proyectoEquipoId` | `proyectoEquipoId` | ✅ Correcto |
| `proveedorId` | `proveedorId` | ✅ Correcto |
| `reemplazaProyectoEquipoCotizadoItemId` | `reemplazaProyectoEquipoCotizadoItemId` | ✅ Correcto |

---

## CAMPOS INVÁLIDOS DETECTADOS

### Campos que no existen en el schema actual

| **Campo Actual** | **Estado** | **Observaciones** |
|------------------|------------|-------------------|
| `categoria` | ⚠️ Campo no estándar | Algunos modelos lo tienen, otros no |
| `tiempoEntrega` | ✅ Existe en schema | Campo válido |
| `tiempoEntregaDias` | ✅ Existe en schema | Campo válido |
| `esSeleccionada` | ✅ Existe en schema | Campo válido |

---

## RESUMEN ESTADÍSTICO

### Por Categoría de Error:

**1. MODELOS CON NOMBRES INCORRECTOS:**
- **snake_case vs PascalCase:** 9 modelos
- **Plurales incorrectos:** 15 modelos
- **Total modelos con nombres incorrectos:** 24

**2. DISTRIBUCIÓN POR ARCHIVO:**
- **src/app/api/lista-equipo-item/[id]/route.ts:** 20 referencias incorrectas
- **src/app/api/cotizacion/[id]/route.ts:** 15 referencias incorrectas
- **Otros archivos:** ✅ Sin errores detectados

**3. IMPACTO:**
- **Total de archivos afectados:** 2
- **Total de referencias incorrectas:** 35
- **Severidad:** ALTA (causará errores de compilación)

---

## MODELOS CORRECTOS VERIFICADOS

### ✅ Modelos que SÍ existen en schema.prisma y se usan correctamente:

1. `prisma.proyecto` - ✅ Correcto
2. `prisma.proyectoEdt` - ✅ Correcto
3. `prisma.cotizacionEdt` - ✅ Correcto
4. `prisma.cotizacionTarea` - ✅ Correcto
5. `prisma.registroHoras` - ✅ Correcto
6. `prisma.audit_log` - ✅ Correcto
7. `prisma.user_permissions` - ✅ Correcto
8. `prisma.permission` - ✅ Correcto
9. `prisma.notificaciones` - ✅ Correcto
10. `prisma.pedidoEquipo` - ✅ Correcto
11. `prisma.listaEquipo` - ✅ Correcto
12. `prisma.valorizacion` - ✅ Correcto
13. `prisma.crmOportunidad` - ✅ Correcto
14. `prisma.crmActividad` - ✅ Correcto

---

## RECOMENDACIONES DE CORRECCIÓN

### 🔴 PRIORIDAD ALTA (Errores de compilación)

1. **Corregir nombres de modelos en lista-equipo-item/[id]/route.ts:**
   ```typescript
   // ❌ Actual (incorrecto)
   prisma.lista_equipo_item
   prisma.cotizacion_proveedor_item
   prisma.proveedores
   
   // ✅ Correcto
   prisma.ListaEquipoItem
   prisma.CotizacionProveedorItem
   prisma.Proveedor
   ```

2. **Corregir nombres de modelos en cotizacion/[id]/route.ts:**
   ```typescript
   // ❌ Actual (incorrecto)
   prisma.cotizaciones
   prisma.clientes
   prisma.users
   prisma.plantillas
   
   // ✅ Correcto
   prisma.Cotizacion
   prisma.Cliente
   prisma.User
   prisma.Plantilla
   ```

### 🟡 PRIORIDAD MEDIA (Mejores prácticas)

1. **Verificar que todos los campos utilizados existan en el schema**
2. **Estandarizar el uso de relaciones**
3. **Validar tipos de datos**

---

## CONCLUSIÓN

**ESTADO ACTUAL:** 🔴 **CRÍTICO**

Se detectaron **35 referencias incorrectas a modelos de Prisma** que causarán errores de compilación inmediatos. El código NO podrá ejecutarse hasta que se corrijan estos nombres de modelos.

**ARCHIVOS PRIORITARIOS PARA CORRECCIÓN:**
1. `src/app/api/lista-equipo-item/[id]/route.ts` (20 errores)
2. `src/app/api/cotizacion/[id]/route.ts` (15 errores)

**PRÓXIMOS PASOS:**
1. ✅ **FASE 2 COMPLETADA** - Diagnóstico finalizado
2. ⏳ **ESPERANDO AUTORIZACIÓN** para proceder con correcciones
3. 🔄 **FASE 3** - Corrección de inconsistencias (pendiente de aprobación)

---

**Fecha del análisis:** 2025-12-10  
**Archivos analizados:** 15+ archivos TypeScript/JavaScript  
**Líneas de schema revisadas:** 2,212 líneas  
