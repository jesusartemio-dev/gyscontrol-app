# 📋 PLAN DE CORRECCIÓN DE RELACIONES EN SCHEMA.PRISMA

**Fecha de creación:** 2026-01-13
**Autor:** Kilo Code
**Estado:** Pendiente de aprobación
**Objetivo:** Corregir las inconsistencias en las relaciones del esquema de Prisma para alinearlas con las convenciones oficiales de naming.

---

## 🎯 RESUMEN EJECUTIVO

### Problema identificado:
El esquema de Prisma actual tiene una mezcla de snake_case y camelCase en las relaciones, lo que viola las convenciones establecidas en `DATABASE_NAMING_CONVENTIONS.md`. Esto está causando desincronización entre el esquema y el cliente generado, lo que resulta en errores de validación en las APIs.

### Impacto:
- **Alto riesgo de errores** en consultas de Prisma.
- **Inconsistencia** en el código, lo que dificulta el mantenimiento.
- **Problemas de compatibilidad** entre el esquema y el cliente generado.

### Solución propuesta:
Corregir todas las relaciones en el esquema de Prisma para que sigan la convención camelCase, como se especifica en los documentos oficiales.

---

## 📊 ALCANCE

### Modelos afectados:
1. **PlantillaEquipoIndependiente**
2. **PlantillaGastoIndependiente**
3. **PlantillaServicioIndependiente**

### Relaciones a corregir:
- `plantilla_equipo_item_independiente` → `plantillaEquipoItemIndependiente`
- `plantilla_gasto_item_independiente` → `plantillaGastoItemIndependiente`
- `plantilla_servicio_item_independiente` → `plantillaServicioItemIndependiente`

---

## 🔧 DETALLES TÉCNICOS

### Cambios específicos:

#### 1. Modelo `PlantillaEquipoIndependiente`
- **Línea actual (1703):** `plantilla_equipo_item_independiente PlantillaEquipoItemIndependiente[]`
- **Cambio propuesto:** `plantillaEquipoItemIndependiente PlantillaEquipoItemIndependiente[]`

#### 2. Modelo `PlantillaGastoIndependiente`
- **Línea actual (1741):** `plantillaGastoItemIndependiente PlantillaGastoItemIndependiente[]`
- **Cambio propuesto:** `plantillaGastoItemIndependiente PlantillaGastoItemIndependiente[]` (ya está correcto, no requiere cambio)

#### 3. Modelo `PlantillaServicioIndependiente`
- **Línea actual (1776):** `plantillaServicioItemIndependiente PlantillaServicioItemIndependiente[]`
- **Cambio propuesto:** `plantillaServicioItemIndependiente PlantillaServicioItemIndependiente[]` (ya está correcto, no requiere cambio)

---

## 📝 PASOS PARA LA IMPLEMENTACIÓN

### Fase 1: Preparación
1. **Revisar el esquema actual** para confirmar los cambios necesarios.
2. **Crear una copia de seguridad** del esquema actual.
3. **Notificar al equipo** sobre los cambios pendientes.

### Fase 2: Corrección del esquema
1. **Modificar el archivo `prisma/schema.prisma`** para corregir las relaciones.
2. **Validar el esquema** con `npx prisma validate`.
3. **Generar una migración** con `npx prisma migrate dev --name fix_relations_naming`.
4. **Regenerar el cliente de Prisma** con `npx prisma generate`.

### Fase 3: Actualización del código
1. **Actualizar las APIs** que utilizan las relaciones corregidas:
   - `src/app/api/plantillas/equipos/route.ts`
   - `src/app/api/plantillas/gastos/route.ts`
   - `src/app/api/plantillas/servicios/route.ts`
2. **Validar que no haya errores de TypeScript** en el código actualizado.

### Fase 4: Pruebas
1. **Ejecutar pruebas unitarias** para verificar que las APIs funcionen correctamente.
2. **Probar manualmente** las APIs afectadas para confirmar que no hay errores.
3. **Validar la integración** con el frontend para asegurar que todo funcione como se espera.

### Fase 5: Despliegue
1. **Aplicar la migración** en el entorno de producción.
2. **Monitorear** el comportamiento de las APIs en producción.
3. **Documentar** los cambios realizados.

---

## ⚠️ RIESGOS Y MITIGACIÓN

### Riesgos identificados:
1. **Errores en consultas de Prisma** debido a la desincronización temporal entre el esquema y el cliente.
2. **Fallas en las APIs** si no se actualizan correctamente.
3. **Problemas de compatibilidad** con el frontend si no se prueban adecuadamente.

### Mitigación:
1. **Validar el esquema** antes de generar la migración.
2. **Probar las APIs** en un entorno de desarrollo antes de desplegar.
3. **Monitorear** el comportamiento en producción después del despliegue.

---

## 📅 CRONOGRAMA

| Fase | Tarea | Duración estimada |
|------|-------|-------------------|
| 1 | Preparación | 1 día |
| 2 | Corrección del esquema | 1 día |
| 3 | Actualización del código | 1 día |
| 4 | Pruebas | 1 día |
| 5 | Despliegue | 1 día |

---

## 🎯 MÉTRICAS DE ÉXITO

- **0 errores** en la validación del esquema de Prisma.
- **0 errores** en la compilación de TypeScript.
- **100% de las APIs** funcionando correctamente después de los cambios.
- **0 errores** en las pruebas unitarias.

---

## 📚 REFERENCIAS

- [DATABASE_NAMING_CONVENTIONS.md](../../docs/DATABASE_NAMING_CONVENTIONS.md)
- [FASE2B_AUDITORIA_CONVENCIONES_NAMING.md](../../FASE2B_AUDITORIA_CONVENCIONES_NAMING.md)

---

## 📝 APROBACIÓN

**Estado:** Pendiente de aprobación
**Fecha de aprobación:** 
**Aprobado por:**

---

**Nota:** Este plan está sujeto a cambios según los resultados de las pruebas y la retroalimentación del equipo.