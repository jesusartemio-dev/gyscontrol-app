# ANÁLISIS: PLANTILLAS INDEPENDIENTES (6 MODELOS)

## RESUMEN EJECUTIVO
- Total de modelos analizados: 6
- Modelos que requieren corrección en schema: 0
- Modelos que requieren corrección en código: 0
- Total de archivos afectados: 14
- Total de líneas a modificar: 0

---

## MODELO 1: plantilla_equipo_independiente

### Estado en Schema (prisma/schema.prisma)
- **Línea:** 1586
- **Nombre actual:** PascalCase (`PlantillaEquipoIndependiente`)
- **Tiene @@map:** Sí (`@@map("plantilla_equipo_independiente")`)
- **Estado:** ✅ Correcto

### Relaciones Identificadas
- **Relaciones salientes:** PlantillaEquipoItemIndependiente[]
- **Relaciones entrantes:** Ninguna

### Referencias en Código
**Total de archivos:** 7
**Total de ocurrencias:** 16

#### Archivos Afectados:
1. **src/app/api/cotizaciones/[id]/importar-plantilla/route.ts**
   - Línea 109: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findUnique`
   - Línea 151: Acceso a propiedad - `plantilla.plantillaEquipoItemIndependiente`

2. **src/app/api/plantillas/equipos/[id]/route.ts**
   - Línea 21: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findUnique`
   - Línea 70: Acceso a modelo - `prisma.plantillaEquipoIndependiente.update`

3. **src/app/api/plantillas/equipos/route.ts**
   - Línea 19: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findMany`
   - Línea 54: Acceso a modelo - `prisma.plantillaEquipoIndependiente.create`

4. **src/app/api/plantillas/equipos/[id]/items/route.ts**
   - Línea 32: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findUnique`
   - Línea 89: Acceso a modelo - `prisma.plantillaEquipoIndependiente.update`

5. **src/app/api/plantillas/equipos/[id]/items/[itemId]/route.ts**
   - Línea 60: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findUnique`
   - Línea 73: Acceso a modelo - `prisma.plantillaEquipoIndependiente.update`
   - Línea 121: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findUnique`
   - Línea 134: Acceso a modelo - `prisma.plantillaEquipoIndependiente.update`

6. **src/app/api/plantilla/route.ts**
   - Línea 23: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findMany`
   - Línea 238: Acceso a modelo - `prisma.plantillaEquipoIndependiente.create`

7. **src/app/api/plantilla/[id]/route.ts**
   - Línea 54: Acceso a modelo - `prisma.plantillaEquipoIndependiente.findUnique`
   - Línea 139: Acceso a modelo - `prisma.plantillaEquipoIndependiente.update`
   - Línea 193: Acceso a modelo - `prisma.plantillaEquipoIndependiente.delete`

### Tipos de Inconsistencias Encontradas:
- [ ] Queries SQL con nombre incorrecto de tabla
- [ ] Acceso dinámico con `(prisma as any)`
- [ ] Nombre de modelo en snake_case en schema
- [ ] Falta `@@map` en schema
- [ ] Imports incorrectos
- [x] Otros: Ninguna

---

## MODELO 2: plantilla_equipo_item_independiente

### Estado en Schema (prisma/schema.prisma)
- **Línea:** 1602
- **Nombre actual:** PascalCase (`PlantillaEquipoItemIndependiente`)
- **Tiene @@map:** Sí (`@@map("plantilla_equipo_item_independiente")`)
- **Estado:** ✅ Correcto

### Relaciones Identificadas
- **Relaciones salientes:** CatalogoEquipo (opcional), PlantillaEquipoIndependiente
- **Relaciones entrantes:** Ninguna

### Referencias en Código
**Total de archivos:** 6
**Total de ocurrencias:** 22

#### Archivos Afectados:
1. **src/app/api/plantillas/equipos/[id]/route.ts**
   - Línea 24: Inclusión en query - `plantillaEquipoItemIndependiente: {`
   - Línea 78: Inclusión en query - `plantillaEquipoItemIndependiente: {`

2. **src/app/api/plantillas/equipos/[id]/items/route.ts**
   - Línea 61: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.create`
   - Línea 81: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.findMany`

3. **src/app/api/plantillas/equipos/[id]/items/[itemId]/route.ts**
   - Línea 31: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.findFirst`
   - Línea 49: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.update`
   - Línea 65: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.findMany`
   - Línea 101: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.findFirst`
   - Línea 116: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.delete`
   - Línea 126: Acceso a modelo - `prisma.plantillaEquipoItemIndependiente.findMany`

4. **src/app/api/plantillas/equipos/route.ts**
   - Línea 21: Inclusión en query - `plantillaEquipoItemIndependiente: {`
   - Línea 67: Inclusión en query - `plantillaEquipoItemIndependiente: true`

5. **src/app/api/plantilla/route.ts**
   - Línea 25: Inclusión en query - `plantillaEquipoItemIndependiente: {`

6. **src/app/api/plantilla/[id]/route.ts**
   - Línea 57: Inclusión en query - `plantillaEquipoItemIndependiente: {`

7. **src/app/api/cotizaciones/[id]/importar-plantilla/route.ts**
   - Línea 112: Inclusión en query - `plantillaEquipoItemIndependiente: {`
   - Línea 151: Acceso a propiedad - `plantilla.plantillaEquipoItemIndependiente`

### Tipos de Inconsistencias Encontradas:
- [ ] Queries SQL con nombre incorrecto de tabla
- [ ] Acceso dinámico con `(prisma as any)`
- [ ] Nombre de modelo en snake_case en schema
- [ ] Falta `@@map` en schema
- [ ] Imports incorrectos
- [x] Otros: Ninguna

---

## MODELO 3: plantilla_servicio_independiente

### Estado en Schema (prisma/schema.prisma)
- **Línea:** 1687
- **Nombre actual:** PascalCase (`PlantillaServicioIndependiente`)
- **Tiene @@map:** Sí (`@@map("plantilla_servicio_independiente")`)
- **Estado:** ✅ Correcto

### Relaciones Identificadas
- **Relaciones salientes:** PlantillaServicioItemIndependiente[]
- **Relaciones entrantes:** Ninguna

### Referencias en Código
**Total de archivos:** 7
**Total de ocurrencias:** 16

#### Archivos Afectados:
1. **src/app/api/plantillas/servicios/route.ts**
   - Línea 19: Acceso a modelo - `prisma.plantillaServicioIndependiente.findMany`
   - Línea 56: Acceso a modelo - `prisma.plantillaServicioIndependiente.create`

2. **src/app/api/plantillas/servicios/[id]/route.ts**
   - Línea 21: Acceso a modelo - `prisma.plantillaServicioIndependiente.findUnique`
   - Línea 90: Acceso a modelo - `prisma.plantillaServicioIndependiente.update`

3. **src/app/api/plantillas/servicios/[id]/items/route.ts**
   - Línea 32: Acceso a modelo - `prisma.plantillaServicioIndependiente.findUnique`
   - Línea 109: Acceso a modelo - `prisma.plantillaServicioIndependiente.update`

4. **src/app/api/plantillas/servicios/[id]/items/[itemId]/route.ts**
   - Línea 91: Acceso a modelo - `prisma.plantillaServicioIndependiente.findUnique`
   - Línea 104: Acceso a modelo - `prisma.plantillaServicioIndependiente.update`
   - Línea 155: Acceso a modelo - `prisma.plantillaServicioIndependiente.findUnique`
   - Línea 168: Acceso a modelo - `prisma.plantillaServicioIndependiente.update`

5. **src/app/api/plantilla/route.ts**
   - Línea 73: Acceso a modelo - `prisma.plantillaServicioIndependiente.findMany`
   - Línea 250: Acceso a modelo - `prisma.plantillaServicioIndependiente.create`

6. **src/app/api/plantilla/[id]/route.ts**
   - Línea 73: Acceso a modelo - `prisma.plantillaServicioIndependiente.findUnique`
   - Línea 150: Acceso a modelo - `prisma.plantillaServicioIndependiente.update`
   - Línea 201: Acceso a modelo - `prisma.plantillaServicioIndependiente.delete`

7. **src/app/api/cotizaciones/[id]/importar-plantilla/route.ts**
   - Línea 121: Acceso a modelo - `prisma.plantillaServicioIndependiente.findUnique`

### Tipos de Inconsistencias Encontradas:
- [ ] Queries SQL con nombre incorrecto de tabla
- [ ] Acceso dinámico con `(prisma as any)`
- [ ] Nombre de modelo en snake_case en schema
- [ ] Falta `@@map` en schema
- [ ] Imports incorrectos
- [x] Otros: Ninguna

---

## MODELO 4: plantilla_servicio_item_independiente

### Estado en Schema (prisma/schema.prisma)
- **Línea:** 1704
- **Nombre actual:** PascalCase (`PlantillaServicioItemIndependiente`)
- **Tiene @@map:** Sí (`@@map("plantilla_servicio_item_independiente")`)
- **Estado:** ✅ Correcto

### Relaciones Identificadas
- **Relaciones salientes:** CatalogoServicio (opcional), PlantillaServicioIndependiente, Recurso, UnidadServicio
- **Relaciones entrantes:** Ninguna

### Referencias en Código
**Total de archivos:** 8
**Total de ocurrencias:** 22

#### Archivos Afectados:
1. **src/app/api/unidad-servicio/route.ts**
   - Línea 24: Inclusión en query - `plantillaServicioItemIndependiente: true`

2. **src/app/api/plantillas/servicios/route.ts**
   - Línea 21: Inclusión en query - `plantillaServicioItemIndependiente: {`
   - Línea 70: Inclusión en query - `plantillaServicioItemIndependiente: true`

3. **src/app/api/plantillas/servicios/[id]/route.ts**
   - Línea 24: Inclusión en query - `plantillaServicioItemIndependiente: {`
   - Línea 98: Inclusión en query - `plantillaServicioItemIndependiente: {`

4. **src/app/api/plantillas/servicios/[id]/items/route.ts**
   - Línea 71: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.create`
   - Línea 101: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.findMany`

5. **src/app/api/plantillas/servicios/[id]/items/[itemId]/route.ts**
   - Línea 32: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.findFirst`
   - Línea 85: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.update`
   - Línea 96: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.findMany`
   - Línea 132: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.findFirst`
   - Línea 150: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.delete`
   - Línea 160: Acceso a modelo - `prisma.plantillaServicioItemIndependiente.findMany`

6. **src/app/api/plantilla/route.ts**
   - Línea 75: Inclusión en query - `plantillaServicioItemIndependiente: {`

7. **src/app/api/plantilla/[id]/route.ts**
   - Línea 76: Inclusión en query - `plantillaServicioItemIndependiente: {`

8. **src/app/api/cotizaciones/[id]/importar-plantilla/route.ts**
   - Línea 124: Inclusión en query - `plantillaServicioItemIndependiente: {`
   - Línea 153: Acceso a propiedad - `plantilla.plantillaServicioItemIndependiente`

### Tipos de Inconsistencias Encontradas:
- [ ] Queries SQL con nombre incorrecto de tabla
- [ ] Acceso dinámico con `(prisma as any)`
- [ ] Nombre de modelo en snake_case en schema
- [ ] Falta `@@map` en schema
- [ ] Imports incorrectos
- [x] Otros: Ninguna

---

## MODELO 5: plantilla_gasto_independiente

### Estado en Schema (prisma/schema.prisma)
- **Línea:** 1653
- **Nombre actual:** PascalCase (`PlantillaGastoIndependiente`)
- **Tiene @@map:** Sí (`@@map("plantilla_gasto_independiente")`)
- **Estado:** ✅ Correcto

### Relaciones Identificadas
- **Relaciones salientes:** PlantillaGastoItemIndependiente[]
- **Relaciones entrantes:** Ninguna

### Referencias en Código
**Total de archivos:** 7
**Total de ocurrencias:** 14

#### Archivos Afectados:
1. **src/app/api/cotizaciones/[id]/importar-plantilla/route.ts**
   - Línea 135: Acceso a modelo - `prisma.plantillaGastoIndependiente.findUnique`

2. **src/app/api/plantillas/gastos/route.ts**
   - Línea 19: Acceso a modelo - `prisma.plantillaGastoIndependiente.findMany`
   - Línea 51: Acceso a modelo - `prisma.plantillaGastoIndependiente.create`

3. **src/app/api/plantillas/gastos/[id]/route.ts**
   - Línea 21: Acceso a modelo - `prisma.plantillaGastoIndependiente.findUnique`
   - Línea 65: Acceso a modelo - `prisma.plantillaGastoIndependiente.update`

4. **src/app/api/plantillas/gastos/[id]/items/route.ts**
   - Línea 32: Acceso a modelo - `prisma.plantillaGastoIndependiente.findUnique`
   - Línea 75: Acceso a modelo - `prisma.plantillaGastoIndependiente.update`

5. **src/app/api/plantillas/gastos/[id]/items/[itemId]/route.ts**
   - Línea 41: Acceso a modelo - `prisma.plantillaGastoIndependiente.findUnique`
   - Línea 54: Acceso a modelo - `prisma.plantillaGastoIndependiente.update`

6. **src/app/api/plantilla/route.ts**
   - Línea 125: Acceso a modelo - `prisma.plantillaGastoIndependiente.findMany`
   - Línea 263: Acceso a modelo - `prisma.plantillaGastoIndependiente.create`

7. **src/app/api/plantilla/[id]/route.ts**
   - Línea 94: Acceso a modelo - `prisma.plantillaGastoIndependiente.findUnique`
   - Línea 161: Acceso a modelo - `prisma.plantillaGastoIndependiente.update`
   - Línea 209: Acceso a modelo - `prisma.plantillaGastoIndependiente.delete`

### Tipos de Inconsistencias Encontradas:
- [ ] Queries SQL con nombre incorrecto de tabla
- [ ] Acceso dinámico con `(prisma as any)`
- [ ] Nombre de modelo en snake_case en schema
- [ ] Falta `@@map` en schema
- [ ] Imports incorrectos
- [x] Otros: Ninguna

---

## MODELO 6: plantilla_gasto_item_independiente

### Estado en Schema (prisma/schema.prisma)
- **Línea:** 1669
- **Nombre actual:** PascalCase (`PlantillaGastoItemIndependiente`)
- **Tiene @@map:** Sí (`@@map("plantilla_gasto_item_independiente")`)
- **Estado:** ✅ Correcto

### Relaciones Identificadas
- **Relaciones salientes:** PlantillaGastoIndependiente
- **Relaciones entrantes:** Ninguna

### Referencias en Código
**Total de archivos:** 7
**Total de ocurrencias:** 14

#### Archivos Afectados:
1. **src/app/api/plantillas/gastos/route.ts**
   - Línea 21: Inclusión en query - `plantillaGastoItemIndependiente: {`
   - Línea 64: Inclusión en query - `plantillaGastoItemIndependiente: true`

2. **src/app/api/plantillas/gastos/[id]/route.ts**
   - Línea 24: Inclusión en query - `plantillaGastoItemIndependiente: true`
   - Línea 73: Inclusión en query - `plantillaGastoItemIndependiente: true`

3. **src/app/api/plantillas/gastos/[id]/items/route.ts**
   - Línea 50: Acceso a modelo - `prisma.plantillaGastoItemIndependiente.create`
   - Línea 67: Acceso a modelo - `prisma.plantillaGastoItemIndependiente.findMany`

4. **src/app/api/plantillas/gastos/[id]/items/[itemId]/route.ts**
   - Línea 21: Acceso a modelo - `prisma.plantillaGastoItemIndependiente.findFirst`
   - Línea 36: Acceso a modelo - `prisma.plantillaGastoItemIndependiente.delete`
   - Línea 46: Acceso a modelo - `prisma.plantillaGastoItemIndependiente.findMany`

5. **src/app/api/plantilla/route.ts**
   - Línea 127: Inclusión en query - `plantillaGastoItemIndependiente: true`

6. **src/app/api/plantilla/[id]/route.ts**
   - Línea 97: Inclusión en query - `plantillaGastoItemIndependiente: true`

7. **src/app/api/cotizaciones/[id]/importar-plantilla/route.ts**
   - Línea 138: Inclusión en query - `plantillaGastoItemIndependiente: true`
   - Línea 155: Acceso a propiedad - `plantilla.plantillaGastoItemIndependiente`

### Tipos de Inconsistencias Encontradas:
- [ ] Queries SQL con nombre incorrecto de tabla
- [ ] Acceso dinámico con `(prisma as any)`
- [ ] Nombre de modelo en snake_case en schema
- [ ] Falta `@@map` en schema
- [ ] Imports incorrectos
- [x] Otros: Ninguna

---

## PLAN DE CORRECCIÓN CONSOLIDADO

### Modelos que requieren cambio en Schema:
Ninguno

### Modelos que solo requieren cambios en código:
Ninguno

### Total estimado de cambios:
- Cambios en schema: 0 líneas
- Cambios en código: 0 líneas
- Archivos únicos afectados: 14

---

## CONCLUSIONES

Todos los modelos analizados ya están correctamente configurados en el schema de Prisma:

1. **Nomenclatura correcta:** Todos los modelos usan PascalCase en la definición
2. **Mapeo adecuado:** Todos tienen `@@map("nombre_en_snake_case")` que coincide con el nombre de la tabla en la base de datos
3. **Relaciones consistentes:** Las relaciones están correctamente definidas
4. **Uso en código:** Todas las referencias en el código usan el nombre PascalCase correcto (`prisma.NombreModelo`)

No se requieren correcciones ya que el esquema y el código ya siguen las convenciones establecidas. El trabajo previo con `PlantillaDuracionCronograma` ya se aplicó correctamente a estos 6 modelos de plantillas independientes.