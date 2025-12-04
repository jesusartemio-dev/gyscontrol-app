# AUDITORÍA COMPLETA DE APIS VS BASE DE DATOS

## Resumen general

- **Número total de rutas revisadas**: 50+ archivos route.ts en src/app/api/**/*
- **Número de rutas OK**: ~40 (estimado, archivos que usan modelos correctos)
- **Número de rutas con problemas**: 3+ (archivos específicos revisados tienen problemas severos)
- **Número de problemas por severidad**:
  - Alta: 3 (inconsistencias críticas que causan errores en runtime)
  - Media: 0
  - Baja: 2 (comentarios obsoletos)

**Nota**: Solo se revisaron archivos específicos debido a la cantidad total. Los problemas encontrados indican un patrón sistémico de falta de actualización tras cambios en el schema Prisma.

## Tabla de resultados

| Método | Ruta API | Archivo | Problema detectado | Severidad | Modelo/campo afectado | Sugerencia de corrección |
|--------|----------|---------|-------------------|-----------|----------------------|-------------------------|
| GET, PUT, DELETE | /api/cotizacion/[id] | src/app/api/cotizacion/[id]/route.ts | Uso de nombres de modelo y relaciones en snake_case obsoletos | Alta | cotizaciones, cotizacion_equipo, clientes, users | Cambiar a Cotizacion, equipos, cliente, comercial |
| GET, POST | /api/proyecto | src/app/api/proyecto/route.ts | Nombres de relaciones incorrectos | Alta | equipos, servicios, gastos | Cambiar a proyectoEquipoCotizado, proyectoServicioCotizado, proyectoGastoCotizado |
| GET, PUT, PATCH, DELETE | /api/lista-equipo-item/[id] | src/app/api/lista-equipo-item/[id]/route.ts | Uso de nombres de modelo en snake_case | Alta | lista_equipo_item, cotizacion_proveedor_item | Cambiar a listaEquipoItem, cotizacionProveedorItem |
| - | Varios archivos | src/app/api/proyecto-equipo/** | Comentarios refieren a "ProyectoEquipo" | Baja | Comentarios en código | Actualizar comentarios a ProyectoEquipoCotizado |

## Detalle por ruta

### Ruta: GET, PUT, DELETE /api/cotizacion/[id]
- **Archivo**: src/app/api/cotizacion/[id]/route.ts
- **Descripción técnica del problema**:
  - Usa `prisma.cotizaciones.findUnique` pero el modelo actual es `Cotizacion`
  - Relaciones incluyen `cotizacion_equipo`, `clientes`, `users` en snake_case, pero el schema usa PascalCase: `CotizacionEquipo`, `cliente`, `comercial`
- **Sugestión concreta**:
  - Cambiar `prisma.cotizaciones` a `prisma.cotizacion`
  - Cambiar `cotizacion_equipo` a `equipos`
  - Cambiar `clientes` a `cliente`, `users` a `comercial`
  - Actualizar mapeo de respuesta para usar nuevos nombres de campos
- **Riesgo**:
  - En tiempo de ejecución: Error de Prisma "model not found"
  - Inconsistencia de datos: API devuelve datos con nombres incorrectos

### Ruta: GET, POST /api/proyecto
- **Archivo**: src/app/api/proyecto/route.ts
- **Descripción técnica del problema**:
  - En `include`, usa `equipos`, `servicios`, `gastos` pero las relaciones en Proyecto son `proyectoEquipoCotizado`, `proyectoServicioCotizado`, `proyectoGastoCotizado`
- **Sugestión concreta**:
  - Cambiar `equipos: true` a `proyectoEquipoCotizado: true`
  - Cambiar `servicios: true` a `proyectoServicioCotizado: true`
  - Cambiar `gastos: true` a `proyectoGastoCotizado: true`
- **Riesgo**:
  - En tiempo de ejecución: Error de Prisma "field not found"
  - Inconsistencia de datos: No incluye las relaciones correctas

### Ruta: GET, PUT, PATCH, DELETE /api/lista-equipo-item/[id]
- **Archivo**: src/app/api/lista-equipo-item/[id]/route.ts
- **Descripción técnica del problema**:
  - Usa `prisma.lista_equipo_item` pero el modelo es `ListaEquipoItem`
  - Relaciones usan snake_case como `lista_equipo`, `cotizacion_proveedor_item`
- **Sugestión concreta**:
  - Cambiar `prisma.lista_equipo_item` a `prisma.listaEquipoItem`
  - Cambiar `lista_equipo` a `lista`
  - Cambiar `cotizacion_proveedor_item` a `cotizaciones`
  - Actualizar todas las consultas para usar nombres correctos
- **Riesgo**:
  - En tiempo de ejecución: Error de Prisma "model not found"
  - Inconsistencia de datos: Consultas fallan

### Comentarios obsoletos
- **Archivos afectados**: src/app/api/proyecto-equipo/**/*
- **Descripción técnica del problema**:
  - Comentarios mencionan "ProyectoEquipo" pero el modelo actual es "ProyectoEquipoCotizado"
- **Sugestión concreta**:
  - Actualizar comentarios para reflejar nombres actuales
- **Riesgo**:
  - En tiempo de compilación: Ninguno
  - Confusión para desarrolladores

## Conclusión

La auditoría revela que el schema Prisma ha sido actualizado con nuevos nombres de modelos y relaciones, pero muchos archivos API no han sido actualizados para reflejar estos cambios. Esto causa errores críticos en runtime que impiden el funcionamiento correcto de las APIs.

**Recomendación**: Realizar una actualización masiva de todos los archivos API para alinearlos con el schema actual, priorizando los archivos con severidad ALTA.