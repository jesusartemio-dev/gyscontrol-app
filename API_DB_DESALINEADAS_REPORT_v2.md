# API_DB_DESALINEADAS_REPORT_v2.md

## RESUMEN EJECUTIVO

**Fecha de auditoría:** 2025-12-02  
**Schema Prisma analizado:** prisma/schema.prisma (91+ modelos)  
**Total de rutas analizadas:** 200+ archivos API  
**Total de servicios analizados:** 80+ archivos de servicios  

**ESTADO ACTUAL:**
- ✅ **Problemas RESUELTOS:** EntregaItem y EventoTrazabilidad (ya existen en schema)
- ❌ **Problemas PENDIENTES:** 15+ archivos con desalineaciones críticas

## ESTADÍSTICAS FINALES

| Categoría | Cantidad | Porcentaje |
|-----------|----------|------------|
| **Rutas 100% alineadas** | 185+ | 92% |
| **Rutas con problemas** | 15+ | 8% |
| **Severidad ALTA** | 8 | 53% |
| **Severidad MEDIA** | 4 | 27% |
| **Severidad BAJA** | 3 | 20% |

## MODELOS PRISMA VÁLIDOS CONFIRMADOS (91+)

### Modelos Principales
- User, Account, Session, VerificationToken
- Cliente, Unidad, UnidadServicio
- CategoriaEquipo, CategoriaServicio, Recurso
- CatalogoEquipo, CatalogoServicio
- Plantilla, PlantillaEquipo, PlantillaEquipoItem, PlantillaServicio, PlantillaServicioItem, PlantillaGasto, PlantillaGastoItem
- Cotizacion, CotizacionEquipo, CotizacionEquipoItem, CotizacionServicio, CotizacionServicioItem, CotizacionGasto, CotizacionGastoItem
- **CotizacionEdt, CotizacionTarea**
- Proyecto, **ProyectoEdt**
- ListaEquipo, ListaEquipoItem, Proveedor
- CotizacionProveedor, CotizacionProveedorItem
- PedidoEquipo, PedidoEquipoItem
- Valorizacion
- RegistroHoras
- Tarea, Subtarea, DependenciaTarea, AsignacionRecurso, RegistroProgreso
- CotizacionExclusion, CotizacionCondicion
- PlantillaExclusion, PlantillaExclusionItem, PlantillaCondicion, PlantillaCondicionItem
- CrmOportunidad, CrmActividad, CrmCompetidorLicitacion, CrmContactoCliente, CrmHistorialProyecto, CrmMetricaComercial
- CotizacionVersion
- **ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem**
- **ProyectoGastoCotizado, ProyectoGastoCotizadoItem**
- **ProyectoServicioCotizado, ProyectoServicioCotizadoItem**
- analytics_events, audit_log
- calendario_laboral, configuracion_calendario, dia_calendario, excepcion_calendario
- cotizacion_actividad, cotizacion_dependencias_tarea, cotizacion_fase, cotizacion_plantilla_import
- fase_default, metrica_comercial, **notificaciones**
- permissions, plantilla_duracion_cronograma
- plantilla_equipo_independiente, plantilla_equipo_item_independiente
- plantilla_gasto_independiente, plantilla_gasto_item_independiente
- plantilla_servicio_independiente, plantilla_servicio_item_independiente
- proyecto_actividad, proyecto_cronograma, proyecto_dependencias_tarea, proyecto_fase, proyecto_subtarea, **proyecto_tarea**
- user_permissions

### ✅ MODELOS NUEVOS CONFIRMADOS (ya no son problemas)
- **EntregaItem** (líneas 2162-2187)
- **EventoTrazabilidad** (líneas 2189-2212)

## LISTADO DE PROBLEMAS DETECTADOS

### 🚨 SEVERIDAD ALTA (8 problemas)

| Ruta/Servicio | Método(s) | Problema | Modelo Afectado | Sugerencia |
|---------------|-----------|----------|-----------------|------------|
| src/app/api/proyectos/[id]/zonas/[zonaId]/route.ts | GET, PUT, DELETE | MODELO_INEXISTENTE | proyectoZona | Cambiar a proyecto_cronograma o eliminar funcionalidad de zonas |
| src/app/api/proyectos/[id]/zonas/route.ts | GET, POST | MODELO_INEXISTENTE | proyectoZona | Cambiar a proyecto_cronograma o eliminar funcionalidad de zonas |
| src/app/api/proyectos/[id]/reordenar/route.ts | POST | MODELO_INEXISTENTE | proyectoZona | Eliminar caso 'zona' del switch |
| src/app/api/proyectos/cronograma/asignar-responsable/route.ts | POST | MODELO_INEXISTENTE | proyectoZona | Eliminar caso 'zona' del switch |
| src/app/api/horas-hombre/elemento/[tipo]/[id]/route.ts | GET | MODELO_INEXISTENTE | proyectoZona | Eliminar referencias a zonas |
| src/app/api/edt/route.ts | GET, POST | MODELO_INEXISTENTE | edt | Cambiar a categoriaServicio |
| src/app/api/edt/[id]/route.ts | GET, PUT, DELETE | MODELO_INEXISTENTE | edt | Cambiar a categoriaServicio |
| src/lib/services/msProjectService.ts | POST | MODELO_INEXISTENTE | proyectoZona | Refactorizar para usar proyecto_cronograma |

### ⚠️ SEVERIDAD MEDIA (4 problemas)

| Ruta/Servicio | Método(s) | Problema | Modelo Afectado | Sugerencia |
|---------------|-----------|----------|-----------------|------------|
| src/lib/services/permissions.ts | GET, POST | MODELO_INEXISTENTE | userPermission, permission | Cambiar a user_permissions, permissions |
| src/lib/services/notificaciones.ts | GET, POST | MODELO_INEXISTENTE | notificacion | Cambiar a notificaciones |
| src/app/api/proyectos/[id]/cronograma/import-edts/route.ts | GET, POST | MODELO_INEXISTENTE | edt | Cambiar a categoriaServicio |
| src/app/api/horas-hombre/resumen-proyectos/route.ts | GET | MODELO_INEXISTENTE | edt | Cambiar a categoriaServicio |

### ℹ️ SEVERIDAD BAJA (3 problemas)

| Ruta/Servicio | Método(s) | Problema | Modelo Afectado | Sugerencia |
|---------------|-----------|----------|-----------------|------------|
| src/app/api/plantillas/servicios/[id]/route.ts | GET, PUT | MODELO_INEXISTENTE | edt | Cambiar referencias a categoriaServicio |
| src/app/api/cotizaciones/[id]/cronograma/generar/route.ts | POST | MODELO_INEXISTENTE | edt | Cambiar a categoriaServicio |
| src/app/api/diagnostico-base-datos/route.ts | GET | MODELO_INEXISTENTE | edt | Cambiar a categoriaServicio |

## DETALLE TÉCNICO POR ARCHIVO

### 1. proyectoZona - MODELO INEXISTENTE

**Archivos afectados:**
- `src/app/api/proyectos/[id]/zonas/[zonaId]/route.ts`
- `src/app/api/proyectos/[id]/zonas/route.ts`
- `src/app/api/proyectos/[id]/reordenar/route.ts`
- `src/app/api/proyectos/cronograma/asignar-responsable/route.ts`
- `src/app/api/horas-hombre/elemento/[tipo]/[id]/route.ts`
- `src/lib/services/msProjectService.ts`

**Problema:** El modelo `proyectoZona` no existe en el schema Prisma actual. Este modelo fue eliminado en la migración al cronograma de 4 niveles.

**Solución:** 
- Eliminar todas las referencias a `proyectoZona`
- Migrar funcionalidad a `proyecto_cronograma` si es necesaria
- O eliminar completamente la funcionalidad de zonas

### 2. edt - MODELO INEXISTENTE

**Archivos afectados:**
- `src/app/api/edt/route.ts`
- `src/app/api/edt/[id]/route.ts`
- `src/app/api/proyectos/[id]/cronograma/import-edts/route.ts`
- `src/app/api/horas-hombre/resumen-proyectos/route.ts`
- `src/app/api/plantillas/servicios/[id]/route.ts`
- `src/app/api/cotizaciones/[id]/cronograma/generar/route.ts`
- `src/app/api/diagnostico-base-datos/route.ts`

**Problema:** El modelo `edt` no existe en el schema Prisma actual. Los EDTs ahora son `ProyectoEdt`.

**Solución:** 
- Cambiar `prisma.edt` por `prisma.categoriaServicio`
- Actualizar todas las consultas y filtros
- Ajustar los tipos TypeScript correspondientes

### 3. userPermission/permission - MODELOS INCORRECTOS

**Archivos afectados:**
- `src/lib/services/permissions.ts`

**Problema:** Usa `userPermission` y `permission` pero los modelos correctos son `user_permissions` y `permissions`.

**Solución:** 
- Cambiar `prisma.userPermission` por `prisma.user_permissions`
- Cambiar `prisma.permission` por `prisma.permissions`

### 4. notificacion - NOMBRE INCORRECTO

**Archivos afectados:**
- `src/lib/services/notificaciones.ts`

**Problema:** Usa `prisma.notificacion` pero el modelo correcto es `notificaciones`.

**Solución:** 
- Cambiar `prisma.notificacion` por `prisma.notificaciones`

## COMPARACIÓN CON REPORTE ANTERIOR

### ✅ PROBLEMAS RESUELTOS (ya NO reportar)
1. **EntregaItem** - ✅ YA EXISTE en schema (líneas 2162-2187)
2. **EventoTrazabilidad** - ✅ YA EXISTE en schema (líneas 2189-2212)

### ❌ PROBLEMAS PERSISTENTES
Los problemas con `proyectoZona` y `edt` siguen existiendo y son los mismos del reporte anterior.

### 🆕 NUEVOS PROBLEMAS DETECTADOS
- `userPermission` vs `user_permissions`
- `permission` vs `permissions` 
- `notificacion` vs `notificaciones`

## SUGERENCIAS DE CORRECCIÓN PRIORIZADAS

### 1. PRIORIDAD ALTA - Infraestructura de Proyectos
1. **Eliminar funcionalidad de zonas** - Refactorizar todas las APIs de `proyectos/[id]/zonas/*`
2. **Migrar EDTs catálogo** - Cambiar `prisma.edt` por `prisma.categoriaServicio`

### 2. PRIORIDAD MEDIA - Servicios Core
3. **Actualizar permissions service** - Cambiar nombres de modelos en `services/permissions.ts`
4. **Corregir notificaciones service** - Cambiar `notificacion` por `notificaciones`

### 3. PRIORIDAD BAJA - APIs Específicas
5. **Actualizar importaciones de EDT** - En APIs de cronogramas
6. **Corregir diagnósticos** - En APIs de diagnóstico

## RECOMENDACIONES TÉCNICAS

1. **Crear script de migración** para actualizar automáticamente los nombres de modelos
2. **Actualizar tipos TypeScript** para reflejar los modelos correctos
3. **Revisar tests** que puedan estar usando los modelos incorrectos
4. **Documentar los cambios** en el schema para evitar regresiones futuras

## CONCLUSIÓN

La auditoría revela que la mayoría de las APIs (92%) están alineadas con el schema Prisma actual. Los problemas principales están relacionados con:

1. **Modelos eliminados** (`proyectoZona`, `edt`) - requieren refactorización arquitectónica
2. **Nombres incorrectos** (`userPermission` vs `user_permissions`) - corrección simple
3. **Referencias obsoletas** en APIs específicas - actualización puntual

**Impacto:** Los problemas de severidad ALTA impiden el funcionamiento correcto de las funcionalidades de zonas y EDTs de catálogo. Los de severidad MEDIA afectan servicios de permisos y notificaciones.

**Próximos pasos:** Implementar las correcciones priorizando las funcionalidades críticas de gestión de proyectos y cronogramas.