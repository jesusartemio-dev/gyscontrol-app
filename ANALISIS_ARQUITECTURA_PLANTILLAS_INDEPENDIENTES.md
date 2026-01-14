# ANÁLISIS DE ARQUITECTURA: PLANTILLAS INDEPENDIENTES

## RESUMEN EJECUTIVO
- Total de archivos afectados: 12 (principalmente APIs y servicios)
- Archivos críticos: 5 (APIs de configuración y cronograma)
- Nivel de riesgo: MEDIO (solo algunos modelos están implementados)
- Tiempo estimado de migración: 2-3 días

## ANÁLISIS POR MODELO

### 1. fase_default → FaseDefault

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1596
- **Relaciones**: CategoriaServicio[]
- **Dependencias**: Referenciado por CategoriaServicio.fase_default

#### APIs (5 archivos encontrados)
1. `src/app/api/proyectos/[id]/cronograma/import-edts/route.ts` - Línea 40
   - Operación: include en findMany
   - Include: fase_default con select
   - Propósito: Importar EDTs con fases

2. `src/app/api/cotizaciones/[id]/cronograma/generar/route.ts` - Líneas 86,179,209
   - Operación: findMany, findUnique
   - Propósito: Generar cronograma con fases por defecto

3. `src/app/api/configuracion/fases/route.ts` - Líneas 32,63,74
   - Operación: findMany, findFirst, create
   - Propósito: CRUD de fases por defecto

4. `src/app/api/configuracion/fases/[id]/route.ts` - Líneas 29,78,90,152
   - Operación: findUnique, findUnique, update, update
   - Propósito: CRUD individual de fases

5. `src/app/api/configuracion/fases-default/route.ts` - Línea 35
   - Operación: findMany
   - Propósito: Obtener fases activas

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 5
- **Complejidad**: MEDIA
- **Riesgo**: MEDIO
- **Funcionalidades**: Configuración de fases, generación de cronogramas

---

### 2. metrica_comercial → MetricaComercial

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1612
- **Relaciones**: User
- **Dependencias**: Referenciado por User.metrica_comercial[]

#### APIs (0 archivos encontrados)

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 0
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Ninguna implementada aún

---

### 3. plantilla_duracion_cronograma → PlantillaDuracionCronograma

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1677
- **Relaciones**: Ninguna
- **Dependencias**: Ninguna

#### APIs (5 archivos encontrados)
1. `src/app/api/debug/specific-model-test/route.ts` - Líneas 13,23
   - Operación: Raw queries COUNT
   - Propósito: Testing de tabla

2. `src/app/api/debug/prisma-test/route.ts` - Línea 20
   - Operación: Raw query COUNT
   - Propósito: Testing Prisma

3. `src/app/api/debug/populate-database/route.ts` - Líneas 11,17,41
   - Operación: Raw queries
   - Propósito: Poblar datos de prueba

4. `src/app/api/debug/clean-test-data/route.ts` - Líneas 10,15
   - Operación: Raw queries DELETE, COUNT
   - Propósito: Limpiar datos de prueba

5. `src/app/api/cotizaciones/[id]/cronograma/generar/route.ts` - Línea 48
   - Operación: findMany
   - Propósito: Obtener duraciones para cronograma

6. `src/app/api/configuracion/duraciones-cronograma/route.ts` - Líneas 56,93,106,156
   - Operación: Raw queries SELECT, INSERT
   - Propósito: CRUD de duraciones

7. `src/app/api/configuracion/duraciones-cronograma/importar/route.ts` - Líneas 56,80
   - Operación: Raw queries SELECT
   - Propósito: Importar duraciones

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 7
- **Complejidad**: MEDIA
- **Riesgo**: MEDIO
- **Funcionalidades**: Configuración de duraciones de cronograma

---

### 4. plantilla_equipo_independiente → PlantillaEquipoIndependiente

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1688
- **Relaciones**: plantilla_equipo_item_independiente[]
- **Dependencias**: Ninguna directa

#### APIs (0 archivos encontrados)

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 0
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Ninguna implementada aún

---

### 5. plantilla_equipo_item_independiente → PlantillaEquipoItemIndependiente

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1702
- **Relaciones**: CatalogoEquipo?, plantilla_equipo_independiente
- **Dependencias**: Referenciado por CatalogoEquipo.plantilla_equipo_item_independiente[]

#### APIs (0 archivos encontrados)

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 0
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Ninguna implementada aún

---

### 6. plantilla_gasto_independiente → PlantillaGastoIndependiente

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1722
- **Relaciones**: plantilla_gasto_item_independiente[]
- **Dependencias**: Ninguna directa

#### APIs (0 archivos encontrados)

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 0
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Ninguna implementada aún

---

### 7. plantilla_gasto_item_independiente → PlantillaGastoItemIndependiente

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1736
- **Relaciones**: plantilla_gasto_independiente
- **Dependencias**: Ninguna directa

#### APIs (0 archivos encontrados)

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 0
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Ninguna implementada aún

---

### 8. plantilla_servicio_independiente → PlantillaServicioIndependiente

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1752
- **Relaciones**: plantilla_servicio_item_independiente[]
- **Dependencias**: Ninguna directa

#### APIs (0 archivos encontrados)

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 0
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Ninguna implementada aún

---

### 9. plantilla_servicio_item_independiente → PlantillaServicioItemIndependiente

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1767
- **Relaciones**: CatalogoServicio?, plantilla_servicio_independiente, Recurso, UnidadServicio
- **Dependencias**: Referenciado por UnidadServicio.plantilla_servicio_item_independiente[], Recurso.plantilla_servicio_item_independiente[], CatalogoServicio.plantilla_servicio_item_independiente[]

#### APIs (0 archivos encontrados)

#### Servicios (0 archivos encontrados)

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 0
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Ninguna implementada aún

---

### 10. user_permissions → UserPermissions

#### Base de Datos
- **Ubicación**: prisma/schema.prisma línea 1948
- **Relaciones**: permissions, User
- **Dependencias**: Referenciado por User.user_permissions[]

#### APIs (0 archivos encontrados)

#### Servicios (1 archivo encontrado)
1. `src/lib/services/permissions.ts` - Líneas 34,226,273,286
   - Operación: findMany, upsert, findUnique, delete
   - Propósito: Gestión de permisos de usuario

#### Componentes (0 archivos encontrados)

#### Hooks (0 archivos encontrados)

#### Tests (0 archivos encontrados)

#### RESUMEN MODELO
- **Archivos afectados**: 1
- **Complejidad**: BAJA
- **Riesgo**: BAJO
- **Funcionalidades**: Gestión de permisos

## ANÁLISIS DE DEPENDENCIAS

### Mapa de Dependencias
```
User → metrica_comercial[]
User → user_permissions[]
CategoriaServicio → fase_default
UnidadServicio → plantilla_servicio_item_independiente[]
Recurso → plantilla_servicio_item_independiente[]
CatalogoServicio → plantilla_servicio_item_independiente[]
CatalogoEquipo → plantilla_equipo_item_independiente[]
plantilla_equipo_independiente → plantilla_equipo_item_independiente[]
plantilla_gasto_independiente → plantilla_gasto_item_independiente[]
plantilla_servicio_independiente → plantilla_servicio_item_independiente[]
```

### Orden de Migración Sugerido
1. metrica_comercial - Sin dependencias críticas
2. user_permissions - Solo dependencias con User y permissions
3. fase_default - Dependencia con CategoriaServicio
4. plantilla_duracion_cronograma - Sin dependencias
5. plantilla_equipo_independiente - Dependencia con items
6. plantilla_equipo_item_independiente - Dependencia con plantilla y CatalogoEquipo
7. plantilla_gasto_independiente - Dependencia con items
8. plantilla_gasto_item_independiente - Dependencia con plantilla
9. plantilla_servicio_independiente - Dependencia con items
10. plantilla_servicio_item_independiente - Múltiples dependencias

## PATRONES DE CÓDIGO ENCONTRADOS

### Patrón 1: Queries con Include
```typescript
include: {
  fase_default: {
    select: { nombre: true, orden: true }
  }
}
```

### Patrón 2: Raw Queries para Configuración
```sql
SELECT * FROM "plantilla_duracion_cronograma" ORDER BY "nivel" ASC
```

### Patrón 3: CRUD Básico en Servicios
```typescript
await prisma.user_permissions.findMany({
  where: { userId }
})
```

## RIESGOS IDENTIFICADOS

### MEDIOS
1. **fase_default en cronogramas**
   - Archivos: 2 APIs de cronograma
   - Mitigación: Actualizar queries de Prisma y tipos generados

2. **plantilla_duracion_cronograma en configuración**
   - Archivos: 2 APIs de configuración
   - Mitigación: Cambiar nombres en raw queries

### BAJOS
1. **user_permissions en permisos**
   - Archivos: 1 servicio
   - Mitigación: Actualizar llamadas a Prisma

## RECOMENDACIONES

### Estrategia de Migración Recomendada
1. **Fase 1**: Actualizar schema.prisma con nuevos nombres
2. **Fase 2**: Ejecutar migración de base de datos
3. **Fase 3**: Actualizar código que usa los modelos (APIs y servicios)
4. **Fase 4**: Regenerar tipos de Prisma
5. **Fase 5**: Testing y validación

### Plan de Testing
1. Verificar que las APIs de fases sigan funcionando
2. Probar configuración de duraciones de cronograma
3. Validar permisos de usuario
4. Ejecutar tests existentes

### Consideraciones Especiales
- Los modelos de plantillas independientes no están implementados aún en el código
- Solo fase_default y plantilla_duracion_cronograma tienen uso real
- user_permissions tiene uso mínimo en servicios

## ESTIMACIÓN DE ESFUERZO

| Fase | Tiempo | Complejidad |
|------|--------|-------------|
| Análisis adicional | 2 horas | baja |
| Cambios en schema | 1 hora | baja |
| Migración BD | 2 horas | media |
| Actualización APIs | 4 horas | media |
| Actualización servicios | 1 hora | baja |
| Regenerar tipos | 30 min | baja |
| Testing | 2 horas | baja |
| **TOTAL** | **12.5 horas** | **media** |

## CONCLUSIONES

El impacto de la migración es relativamente bajo ya que la mayoría de los modelos (plantillas independientes) no están implementados en el código aún. Los modelos críticos son fase_default (usado en cronogramas) y plantilla_duracion_cronograma (usado en configuración). Se recomienda proceder con la migración siguiendo el orden sugerido para minimizar riesgos.