# 📋 PLAN DE SIMPLIFICACIÓN DE FÓRMULAS EN SERVICIOS

## 🎯 **OBJETIVO**
Simplificar el sistema de servicios eliminando las fórmulas "Proporcional" y "Fijo", manteniendo únicamente la fórmula "Escalonada" que cubre todos los casos de uso necesarios.

## 📊 **ESTADO ACTUAL**
- **3 fórmulas**: Proporcional, Escalonada, Fijo
- **5 campos de horas**: horaBase, horaRepetido, horaUnidad, horaFijo, formula
- **Columnas innecesarias**: Fórmula, HH Unidad, HH Fijo

## 🎯 **ESTADO OBJETIVO**
- **1 fórmula**: Solo Escalonada
- **2 campos de horas**: horaBase, horaRepetido
- **Columnas eliminadas**: Fórmula, HH Unidad, HH Fijo

---

## 📋 **FASES DE IMPLEMENTACIÓN**

### **FASE 1: PREPARACIÓN Y ANÁLISIS** ⏱️ 30 min
- [ ] **Backup de base de datos** (ambiente de prueba)
- [ ] **Análisis de datos existentes** - verificar servicios con fórmulas diferentes
- [ ] **Crear script de conversión** para migrar datos existentes
- [ ] **Documentar dependencias** entre módulos

### **FASE 2: CAMBIOS EN BASE DE DATOS** ⏱️ 45 min
- [ ] **Actualizar schema Prisma** (`prisma/schema.prisma`)
  - Eliminar campo `formula` de `CatalogoServicio`
  - Eliminar campo `horaUnidad` de `CatalogoServicio`
  - Eliminar campo `horaFijo` de `CatalogoServicio`
  - Mantener `horaBase` y `horaRepetido`
- [ ] **Generar migración Prisma**
- [ ] **Actualizar interfaces TypeScript** (`src/types/modelos.ts`)
  - Eliminar `TipoFormula` o simplificar
  - Actualizar `CatalogoServicio` interface
  - Actualizar `CatalogoServicioPayload`

### **FASE 3: CAMBIOS EN COMPONENTES UI** ⏱️ 1 hora
- [ ] **CatalogoServicioTable.tsx**
  - Eliminar columna "Fórmula"
  - Eliminar columna "HH Unidad"
  - Eliminar columna "HH Fijo"
  - Simplificar lógica de edición
  - Actualizar cálculo de horas (solo escalonada)
- [ ] **CatalogoServicioForm.tsx** (si existe)
  - Eliminar selector de fórmula
  - Eliminar campos horaUnidad y horaFijo
  - Mantener horaBase y horaRepetido

### **FASE 4: CAMBIOS EN UTILIDADES EXCEL** ⏱️ 45 min
- [ ] **serviciosExcel.ts** (Exportación)
  - Eliminar columnas "Fórmula", "HH Unidad", "HH Fijo"
  - Simplificar función `calcularHoras` (solo escalonada)
  - Mantener compatibilidad con archivos antiguos
- [ ] **serviciosImportUtils.ts** (Importación)
  - Eliminar lectura de columnas innecesarias
  - Forzar fórmula "Escalonada" en importación
  - Mantener compatibilidad backward

### **FASE 5: CAMBIOS EN PLANTILLAS** ⏱️ 30 min
- [ ] **PlantillaServicioItem** model
  - Eliminar campos `formula`, `horaUnidad`, `horaFijo`
- [ ] **PlantillaServicio** componentes
  - Actualizar lógica de cálculo
  - Eliminar campos de formulario

### **FASE 6: CAMBIOS EN COTIZACIONES** ⏱️ 30 min
- [ ] **CotizacionServicioItem** model
  - Eliminar campos `formula`, `horaUnidad`, `horaFijo`
- [ ] **Componentes de cotización**
  - Actualizar lógica de cálculo
  - Eliminar campos innecesarios

### **FASE 7: CAMBIOS EN PROYECTOS** ⏱️ 30 min
- [ ] **ProyectoServicioCotizadoItem** model
  - Eliminar campos `formula`, `horaUnidad`, `horaFijo`
- [ ] **Componentes de proyecto**
  - Actualizar cálculos de horas

### **FASE 8: CAMBIOS EN APIs** ⏱️ 30 min
- [ ] **API routes de servicios**
  - Actualizar validaciones
  - Eliminar campos de request/response
- [ ] **API routes de plantillas**
- [ ] **API routes de cotizaciones**
- [ ] **API routes de proyectos**

### **FASE 9: TESTING Y VALIDACIÓN** ⏱️ 1 hora
- [ ] **Pruebas unitarias**
  - Cálculos de horas escalonadas
  - Validaciones de formulario
- [ ] **Pruebas de integración**
  - Exportación/Importación Excel
  - Flujo completo: Servicio → Plantilla → Cotización → Proyecto
- [ ] **Pruebas de UI/UX**
  - Interfaz simplificada
  - Compatibilidad backward
- [ ] **Validación de datos**
  - Migración correcta de datos existentes

---

## 🔄 **ESTRATEGIA DE MIGRACIÓN DE DATOS**

### **Script de Conversión** (FASE 1)
```sql
-- Convertir servicios Proporcional a Escalonada
UPDATE catalogo_servicio
SET horaBase = 0, horaRepetido = horaUnidad
WHERE formula = 'Proporcional' AND horaUnidad IS NOT NULL;

-- Convertir servicios Fijo a Escalonada
UPDATE catalogo_servicio
SET horaBase = horaFijo, horaRepetido = 0
WHERE formula = 'Fijo' AND horaFijo IS NOT NULL;

-- Eliminar campos innecesarios (después de migración)
ALTER TABLE catalogo_servicio DROP COLUMN formula;
ALTER TABLE catalogo_servicio DROP COLUMN horaUnidad;
ALTER TABLE catalogo_servicio DROP COLUMN horaFijo;
```

### **Compatibilidad Backward en Excel**
- Archivos antiguos con columna "Fórmula" → Ignorar y usar "Escalonada"
- Archivos antiguos con "HH Unidad" → Convertir a horaRepetido
- Archivos antiguos con "HH Fijo" → Convertir a horaBase

---

## 📊 **IMPACTO POR MÓDULO**

| Módulo | Archivos Afectados | Complejidad | Tiempo Estimado |
|--------|-------------------|-------------|-----------------|
| **Base de Datos** | schema.prisma, migraciones | 🔴 Alta | 45 min |
| **UI Catálogo** | CatalogoServicioTable.tsx | 🟡 Media | 1 hora |
| **Excel Utils** | serviciosExcel.ts, serviciosImportUtils.ts | 🟡 Media | 45 min |
| **Plantillas** | PlantillaServicioItem, componentes | 🟢 Baja | 30 min |
| **Cotizaciones** | CotizacionServicioItem, componentes | 🟢 Baja | 30 min |
| **Proyectos** | ProyectoServicioCotizadoItem, componentes | 🟢 Baja | 30 min |
| **APIs** | Routes de servicios/cotizaciones/proyectos | 🟡 Media | 30 min |
| **Testing** | Pruebas unitarias e integración | 🟡 Media | 1 hora |

**Total estimado: ~5 horas**

---

## ✅ **BENEFICIOS ESPERADOS**

1. **Interfaz más limpia**: 3 columnas menos en la tabla
2. **Menos errores**: Usuario no elige fórmula equivocada
3. **Código simplificado**: Sin lógica condicional compleja
4. **Mejor rendimiento**: Menos campos en queries
5. **Mantenimiento reducido**: Menos código que mantener

---

## ⚠️ **RIESGOS Y MITIGACIONES**

### **Riesgos Identificados:**
1. **Pérdida de datos** → Backup obligatorio
2. **Incompatibilidad backward** → Mantener compatibilidad en Excel
3. **Errores en cálculos** → Testing exhaustivo
4. **Dependencias ocultas** → Análisis completo del código

### **Mitigaciones:**
- ✅ Backup completo antes de cambios
- ✅ Ambiente de prueba para validación
- ✅ Compatibilidad backward en importación
- ✅ Testing paso a paso por módulo

---

## 📋 **CHECKLIST DE VALIDACIÓN**

### **Antes de Implementar:**
- [ ] Backup de base de datos
- [ ] Análisis de datos existentes
- [ ] Script de migración listo

### **Después de Cada Fase:**
- [ ] Compilación sin errores
- [ ] Funcionalidad básica operativa
- [ ] Cálculos de horas correctos

### **Validación Final:**
- [ ] Exportación/Importación Excel funciona
- [ ] Flujo Servicio → Plantilla → Cotización → Proyecto
- [ ] Interfaz de usuario limpia
- [ ] Datos existentes migrados correctamente

---

## 🚀 **SIGUIENTE PASOS**

1. **Confirmar aprobación** del plan
2. **Ejecutar FASE 1** (Preparación)
3. **Implementar por módulos** siguiendo el orden establecido
4. **Testing exhaustivo** antes de deploy a producción

**¿Estás de acuerdo con este plan? ¿Quieres que proceda con la implementación?**