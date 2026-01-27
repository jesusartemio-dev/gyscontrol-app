# 📋 DIAGNÓSTICO DE SIMPLIFICACIÓN DE FÓRMULAS EN SERVICIOS

## 🎯 **OBJETIVO**
Identificar el estado actual de la implementación del plan de simplificación de fórmulas en el sistema de catálogo de servicios.

## 📊 **ESTADO ACTUAL**

### FASE 2 (Base de Datos): ❌ PENDIENTE
- **Detalles:** El schema aún contiene los campos `formula`, `horaUnidad`, y `horaFijo`, los cuales deberían haber sido eliminados según el plan.
- **Evidence:**
  ```prisma
  model CatalogoServicio {
    id                                    String                                  @id @default(cuid())
    categoriaId                           String
    unidadServicioId                      String
    recursoId                             String
    nombre                                String
    descripcion                           String
    formula                               String  // ❌ DEBERÍA ESTAR ELIMINADO
    horaBase                              Float?
    horaRepetido                          Float?
    horaUnidad                            Float?  // ❌ DEBERÍA ESTAR ELIMINADO
    horaFijo                              Float?  // ❌ DEBERÍA ESTAR ELIMINADO
    createdAt                             DateTime                                @default(now())
    updatedAt                             DateTime                                @updatedAt
    orden                                 Int?                                    @default(0)
    categoria                             Edt                       @relation(fields: [categoriaId], references: [id])
    recurso                               Recurso                                 @relation(fields: [recursoId], references: [id])
    unidadServicio                        UnidadServicio                          @relation(fields: [unidadServicioId], references: [id])
    cotizacionServicioItems               CotizacionServicioItem[]
    plantillaItems                        PlantillaServicioItem[]
    ProyectoServicioCotizadoItem          ProyectoServicioCotizadoItem[]
    plantilla_servicio_item_independiente PlantillaServicioItemIndependiente[]
  }
  ```

### FASE 3 (UI): ✅ COMPLETADA
- **Detalles:** Los componentes `CatalogoServicioTable.tsx` y `CatalogoServicioForm.tsx` han sido actualizados para mostrar solo los campos `horaBase` y `horaRepetido`, sin referencia a `formula`, `horaUnidad`, o `horaFijo`.
- **Evidence:**
  - `CatalogoServicioForm.tsx` solo incluye campos para `horaBase` y `horaRepetido`.
  - `CatalogoServicioTable.tsx` solo muestra columnas para `HH Base` y `HH Repetido`.

### FASE 4 (Excel Import/Export): ✅ COMPLETADA
- **Detalles:** Los archivos `serviciosImportUtils.ts` y `serviciosExcel.ts` han sido actualizados para no leer ni exportar las columnas "Fórmula", "HH Unidad", y "HH Fijo".
- **Evidence:**
  - `serviciosImportUtils.ts` no lee las columnas "Fórmula", "HH Unidad", o "HH Fijo".
  - `serviciosExcel.ts` no exporta las columnas "Fórmula", "HH Unidad", o "HH Fijo".

### FASE 8 (APIs): ✅ COMPLETADA
- **Detalles:** La API en `src/app/api/catalogo-servicio/route.ts` no valida ni requiere el campo `formula`, y acepta correctamente `horaBase` y `horaRepetido`.
- **Evidence:**
  - La API no valida ni requiere el campo `formula`.
  - La API acepta `horaBase` y `horaRepetido` en el payload.

## ⚠️ **ERROR ACTUAL**

El error "Argument `formula` is missing" ocurre porque:

**HIPÓTESIS 1: FASE 2 NO COMPLETADA**
- El schema aún tiene el campo `formula` como obligatorio.
- El código de importación NO envía `formula`.
- **Solución:** Eliminar el campo `formula` del schema.

## 🚀 **PLAN DE CORRECCIÓN**

### 1. **Fases Completas:**
- FASE 3 (UI)
- FASE 4 (Excel Import/Export)
- FASE 8 (APIs)

### 2. **Fases Incompletas:**
- FASE 2 (Base de Datos)

### 3. **Lista Específica de Cambios Necesarios:**
- Eliminar los campos `formula`, `horaUnidad`, y `horaFijo` del modelo `CatalogoServicio` en `prisma/schema.prisma`.
- Generar una migración de Prisma para aplicar estos cambios a la base de datos.

### 4. **Orden de Ejecución de los Cambios:**
1. Actualizar el schema de Prisma.
2. Generar y aplicar la migración de Prisma.
3. Verificar que la base de datos refleje los cambios.

## 📋 **SIGUIENTES PASOS**

1. **Actualizar el Schema de Prisma:**
   - Eliminar los campos `formula`, `horaUnidad`, y `horaFijo` del modelo `CatalogoServicio`.

2. **Generar Migración de Prisma:**
   - Ejecutar `npx prisma migrate dev --name remove_formula_fields` para generar y aplicar la migración.

3. **Verificar la Base de Datos:**
   - Confirmar que las columnas `formula`, `horaUnidad`, y `horaFijo` han sido eliminadas de la tabla `CatalogoServicio` en la base de datos.

4. **Testing:**
   - Probar la funcionalidad de importación/exportación de servicios para asegurar que todo funcione correctamente.
   - Verificar que la UI y las APIs funcionen sin errores.

**¿Estás de acuerdo con este diagnóstico y plan de corrección? ¿Quieres que proceda con la implementación?**