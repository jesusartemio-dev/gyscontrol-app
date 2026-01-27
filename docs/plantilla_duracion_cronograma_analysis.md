# ANÁLISIS DETALLADO: plantilla_duracion_cronograma

## RESUMEN EJECUTIVO
- Total de archivos afectados: 10
- Total de líneas a modificar: 30+
- Riesgo estimado: Medio

---

## 1. ESQUEMA DE PRISMA

### Modelo Actual (prisma/schema.prisma - Línea 1573)
```prisma
model PlantillaDuracionCronograma {
  id               String   @id
  nivel            String   @unique
  duracionDias     Float
  horasPorDia      Int      @default(8)
  bufferPorcentaje Float    @default(10.0)
  activo           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime

  @@map("plantilla_duracion_cronograma")
}
```

### Relaciones Identificadas
- **Relaciones salientes:** Ninguna
- **Relaciones entrantes:** Ninguna

### Índices y Constraints
- Índice único en el campo `nivel`
- Mapeo a tabla `plantilla_duracion_cronograma` en la base de datos

---

## 2. ARCHIVOS DE CÓDIGO FUENTE

### API Routes (6 archivos)

#### Archivo 1: src/app/api/debug/clean-test-data/route.ts
**Líneas afectadas:**
- Línea 10: `await prisma.$queryRaw\`DELETE FROM "PlantillaDuracionCronograma"\``
  ```typescript
  // Clear all data from the table
  await prisma.$queryRaw`DELETE FROM "PlantillaDuracionCronograma"`
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 15: `await prisma.$queryRaw\`SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"\``
  ```typescript
  // Verify the table is empty
  const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"`
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

#### Archivo 2: src/app/api/debug/specific-model-test/route.ts
**Líneas afectadas:**
- Línea 13: `const result = await pool.query('SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"')`
  ```typescript
  console.log('Testing direct SQL query...')
  const result = await pool.query('SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"')
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 23: `await prisma.$queryRaw\`SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"\``
  ```typescript
  console.log('Testing Prisma without adapter...')
  const result2 = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"`
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 29: `const model = (prisma as any).plantillaDuracionCronograma`
  ```typescript
  console.log('Testing Prisma model access...')
  const model = (prisma as any).plantillaDuracionCronograma
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

#### Archivo 3: src/app/api/debug/prisma-test/route.ts
**Líneas afectadas:**
- Línea 20: `await prisma.$queryRaw\`SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"\``
  ```typescript
  const result = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"
  `
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

#### Archivo 4: src/app/api/debug/prisma-model-test/route.ts
**Líneas afectadas:**
- Línea 12: `(prisma as any).plantillaDuracionCronograma !== undefined`
  ```typescript
  // Check if the specific model exists
  const hasModel = (prisma as any).plantillaDuracionCronograma !== undefined
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

- Línea 17: `await (prisma as any).plantillaDuracionCronograma.findMany({
  ```typescript
  console.log('✅ Model exists, attempting query...')
  const duraciones = await (prisma as any).plantillaDuracionCronograma.findMany({
    orderBy: { nivel: 'asc' }
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

#### Archivo 5: src/app/api/cotizaciones/[id]/cronograma/generar/route.ts
**Líneas afectadas:**
- Línea 48: `await prisma.plantillaDuracionCronograma.findMany({
  ```typescript
  try {
    const duraciones = await prisma.plantillaDuracionCronograma.findMany({
      where: { activo: true }
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en query

#### Archivo 6: src/app/api/configuracion/duraciones-cronograma/route.ts
**Líneas afectadas:**
- Línea 56: `await prisma.$queryRaw\`SELECT * FROM "PlantillaDuracionCronograma"\``
  ```typescript
  const duraciones = await prisma.$queryRaw`
    SELECT * FROM "PlantillaDuracionCronograma"
    ORDER BY "nivel" ASC
  `
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 93: `await prisma.$queryRaw\`SELECT * FROM "PlantillaDuracionCronograma"\``
  ```typescript
  const existente = await prisma.$queryRaw`
    SELECT * FROM "PlantillaDuracionCronograma"
    WHERE "nivel" = ${validatedData.nivel} AND "activo" = true
  `
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 106: `await prisma.$queryRaw\`INSERT INTO "PlantillaDuracionCronograma"\``
  ```typescript
  const nuevaDuracion = await prisma.$queryRaw`
    INSERT INTO "PlantillaDuracionCronograma"
    ("id", "nivel", "duracionDias", "horasPorDia", "bufferPorcentaje", "activo", "createdAt", "updatedAt")
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 156: `await prisma.$queryRaw\`INSERT INTO "PlantillaDuracionCronograma"\``
  ```typescript
  await prisma.$queryRaw`
    INSERT INTO "PlantillaDuracionCronograma"
    ("id", "nivel", "duracionDias", "horasPorDia", "bufferPorcentaje", "activo", "createdAt", "updatedAt")
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

#### Archivo 7: src/app/api/configuracion/duraciones-cronograma/[id]/route.ts
**Líneas afectadas:**
- Línea 42: `await (prisma as any).plantillaDuracionCronograma.findUnique({
  ```typescript
  // Verificar que la plantilla existe
  const plantillaExistente = await (prisma as any).plantillaDuracionCronograma.findUnique({
    where: { id }
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

- Línea 60: `await (prisma as any).plantillaDuracionCronograma.findFirst({
  ```typescript
  // Activar - verificar que no haya otra activa con misma combinación
  const conflicto = await (prisma as any).plantillaDuracionCronograma.findFirst({
    where: {
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

- Línea 77: `await (prisma as any).plantillaDuracionCronograma.update({
  ```typescript
  // Actualizar plantilla
  const plantillaActualizada = await (prisma as any).plantillaDuracionCronograma.update({
    where: { id },
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

- Línea 124: `await (prisma as any).plantillaDuracionCronograma.findUnique({
  ```typescript
  // Verificar que la plantilla existe
  const plantillaExistente = await (prisma as any).plantillaDuracionCronograma.findUnique({
    where: { id }
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

- Línea 133: `await (prisma as any).plantillaDuracionCronograma.update({
  ```typescript
  // Desactivar plantilla (soft delete)
  const plantillaDesactivada = await (prisma as any).plantillaDuracionCronograma.update({
    where: { id },
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

#### Archivo 8: src/app/api/configuracion/duraciones-cronograma/importar/route.ts
**Líneas afectadas:**
- Línea 56: `await prisma.$queryRaw\`SELECT DISTINCT "nivel" FROM "PlantillaDuracionCronograma"\``
  ```typescript
  const duracionesExistentes = await prisma.$queryRaw`
    SELECT DISTINCT "nivel" FROM "PlantillaDuracionCronograma"
  `
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 80: `await prisma.$queryRaw\`SELECT * FROM "PlantillaDuracionCronograma"\``
  ```typescript
  const existingDuracion = await prisma.$queryRaw`
    SELECT * FROM "PlantillaDuracionCronograma"
    WHERE "nivel" = ${duracion.nivel}
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

#### Archivo 9: src/app/api/configuracion/duraciones-cronograma/exportar/route.ts
**Líneas afectadas:**
- Línea 27: `await (prisma as any).plantillaDuracionCronograma.findMany({
  ```typescript
  // Obtener todas las plantillas activas
  const plantillas = await (prisma as any).plantillaDuracionCronograma.findMany({
    where: { activo: true },
  ```
  **Tipo de cambio:** Actualizar nombre del modelo en acceso dinámico

#### Archivo 10: src/app/api/debug/populate-database/route.ts
**Líneas afectadas:**
- Línea 11: `await prisma.$queryRaw\`SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"\``
  ```typescript
  // Insert test data if table is empty
  const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "PlantillaDuracionCronograma"`
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 17: `await prisma.$queryRaw\`INSERT INTO "PlantillaDuracionCronograma"\``
  ```typescript
  await prisma.$queryRaw`
    INSERT INTO "PlantillaDuracionCronograma"
    ("id", "tipoProyecto", "nivel", "duracionDias", "horasPorDia", "bufferPorcentaje", "activo", "createdAt", "updatedAt")
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

- Línea 41: `await prisma.$queryRaw\`SELECT * FROM "PlantillaDuracionCronograma"\``
  ```typescript
  const testQuery = await prisma.$queryRaw`
    SELECT * FROM "PlantillaDuracionCronograma"
    ORDER BY "nivel" ASC
  ```
  **Tipo de cambio:** Actualizar nombre de tabla en query

---

## 3. PATRONES IDENTIFICADOS

### Patrones de Uso Común
1. **Query directo:** `prisma.$queryRaw\`SELECT * FROM "PlantillaDuracionCronograma"\`` - 8 ocurrencias
2. **Acceso dinámico al modelo:** `(prisma as any).plantillaDuracionCronograma` - 6 ocurrencias
3. **Query con Prisma Client:** `prisma.plantillaDuracionCronograma.findMany()` - 1 ocurrencia

---

## 4. ANÁLISIS DE IMPACTO

### Archivos Críticos (Prioridad Alta)
1. **src/app/api/configuracion/duraciones-cronograma/route.ts**
   - Razón: API principal que gestiona este modelo
   - Cambios requeridos: 4 líneas
   - Complejidad: Media

2. **src/app/api/configuracion/duraciones-cronograma/[id]/route.ts**
   - Razón: API para gestión individual de registros
   - Cambios requeridos: 5 líneas
   - Complejidad: Media

3. **src/app/api/cotizaciones/[id]/cronograma/generar/route.ts**
   - Razón: API que utiliza los datos para generación de cronogramas
   - Cambios requeridos: 1 línea
   - Complejidad: Baja

### Archivos Importantes (Prioridad Media)
1. **src/app/api/configuracion/duraciones-cronograma/importar/route.ts**
   - Cambios requeridos: 2 líneas

2. **src/app/api/configuracion/duraciones-cronograma/exportar/route.ts**
   - Cambios requeridos: 1 línea

### Archivos Menores (Prioridad Baja)
1. **src/app/api/debug/** archivos
   - Cambios requeridos: 10 líneas en total
   - Razón: Archivos de debug/testing

---

## 5. RIESGOS IDENTIFICADOS

1. **Riesgo 1:** Inconsistencia en el mapeo de la tabla si no se actualiza correctamente
   - Severidad: Alta
   - Mitigación: Verificar que el atributo `@@map` en el schema de Prisma coincida con el nombre de la tabla en la base de datos

2. **Riesgo 2:** Errores en tiempo de ejecución si no se actualizan todos los accesos dinámicos al modelo
   - Severidad: Media
   - Mitigación: Buscar exhaustivamente todos los usos de `(prisma as any).plantillaDuracionCronograma`

3. **Riesgo 3:** Problemas con migraciones si la tabla ya existe en la base de datos
   - Severidad: Media
   - Mitigación: Crear una migración específica para renombrar la tabla en la base de datos

---

## 6. PLAN DE MODIFICACIÓN PASO A PASO

### Paso 1: Actualizar Schema de Prisma
```bash
# Ubicación: prisma/schema.prisma
# Línea: 1573

# ANTES:
model PlantillaDuracionCronograma {
  id               String   @id
  nivel            String   @unique
  duracionDias     Float
  horasPorDia      Int      @default(8)
  bufferPorcentaje Float    @default(10.0)
  activo           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime

  @@map("plantilla_duracion_cronograma")
}

# DESPUÉS:
model PlantillaDuracionCronograma {
  id               String   @id
  nivel            String   @unique
  duracionDias     Float
  horasPorDia      Int      @default(8)
  bufferPorcentaje Float    @default(10.0)
  activo           Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime

  @@map("plantilla_duracion_cronograma")
}
```

### Paso 2: Actualizar Referencias en Archivos de Código
**En orden de prioridad:**

1. `src/app/api/configuracion/duraciones-cronograma/route.ts`
   - Cambio en línea 56: Actualizar nombre de tabla en query
   - Cambio en línea 93: Actualizar nombre de tabla en query
   - Cambio en línea 106: Actualizar nombre de tabla en query
   - Cambio en línea 156: Actualizar nombre de tabla en query

2. `src/app/api/configuracion/duraciones-cronograma/[id]/route.ts`
   - Cambio en línea 42: Actualizar nombre del modelo en acceso dinámico
   - Cambio en línea 60: Actualizar nombre del modelo en acceso dinámico
   - Cambio en línea 77: Actualizar nombre del modelo en acceso dinámico
   - Cambio en línea 124: Actualizar nombre del modelo en acceso dinámico
   - Cambio en línea 133: Actualizar nombre del modelo en acceso dinámico

3. `src/app/api/cotizaciones/[id]/cronograma/generar/route.ts`
   - Cambio en línea 48: Actualizar nombre del modelo en query

4. `src/app/api/configuracion/duraciones-cronograma/importar/route.ts`
   - Cambio en línea 56: Actualizar nombre de tabla en query
   - Cambio en línea 80: Actualizar nombre de tabla en query

5. `src/app/api/configuracion/duraciones-cronograma/exportar/route.ts`
   - Cambio en línea 27: Actualizar nombre del modelo en acceso dinámico

6. Archivos de debug (prioridad baja):
   - `src/app/api/debug/clean-test-data/route.ts`
   - `src/app/api/debug/specific-model-test/route.ts`
   - `src/app/api/debug/prisma-test/route.ts`
   - `src/app/api/debug/prisma-model-test/route.ts`
   - `src/app/api/debug/populate-database/route.ts`

### Paso 3: Validación
```bash
# 1. Validar esquema
npx prisma validate

# 2. Regenerar cliente
npx prisma generate

# 3. Verificar TypeScript
npm run type-check

# 4. Ejecutar tests (si existen)
npm run test
```

---

## 7. COMANDOS DE BÚSQUEDA Y REEMPLAZO

### Búsqueda segura antes de cambiar
```bash
# Ver todas las ocurrencias
grep -r "plantilla_duracion_cronograma" src/ --include="*.ts" --include="*.tsx"

# Contar ocurrencias
grep -r "plantilla_duracion_cronograma" src/ --include="*.ts" --include="*.tsx" | wc -l
```

### Después de los cambios - Verificación
```bash
# Verificar que no queden referencias antiguas
grep -r "plantilla_duracion_cronograma" src/ --include="*.ts" --include="*.tsx"
# (debería retornar 0 resultados)
```

---

## 8. CHECKLIST DE VALIDACIÓN

Pre-cambios:
- [ ] Backup del schema creado
- [ ] Lista completa de archivos a modificar
- [ ] Entendimiento de todas las relaciones

Durante cambios:
- [ ] Schema de Prisma actualizado
- [ ] Relaciones en otros modelos actualizadas
- [ ] Imports actualizados en archivos .ts/.tsx
- [ ] Queries de Prisma actualizados
- [ ] Tipos TypeScript actualizados

Post-cambios:
- [ ] `npx prisma validate` ejecutado sin errores
- [ ] `npx prisma generate` ejecutado exitosamente
- [ ] No hay errores de compilación TypeScript
- [ ] Búsqueda de "plantilla_duracion_cronograma" retorna 0 resultados en src/
- [ ] API endpoints funcionan correctamente
- [ ] No hay regresiones

---

## 9. NOTAS ADICIONALES

- El modelo `PlantillaDuracionCronograma` no tiene relaciones con otros modelos, lo que simplifica la modificación.
- Todos los accesos al modelo se hacen mediante queries directas o acceso dinámico, no hay imports de tipos específicos.
- Es importante mantener el atributo `@@map("plantilla_duracion_cronograma")` para que el mapeo a la tabla en la base de datos sea correcto.
- Se recomienda hacer una migración de base de datos para renombrar la tabla si es necesario, aunque en este caso solo se está actualizando el nombre del modelo en el código, no el nombre de la tabla en la base de datos.