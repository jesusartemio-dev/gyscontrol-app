# 🔄 Rediseño del Flujo de Cronogramas - Arquitectura Simplificada

## 📋 Resumen Ejecutivo

Este documento describe el rediseño completo del sistema de cronogramas para implementar un flujo simplificado de 3 cronogramas por proyecto con roles claramente definidos.

## 🎯 Flujo Actual vs. Nuevo Flujo

### ❌ Flujo Actual (Problemático)
- Creación automática de múltiples cronogramas
- Baseline automático sin control del usuario
- Múltiples cronogramas del mismo tipo permitidos
- Confusión sobre cuál cronograma usar

### ✅ Flujo Nuevo (Simplificado)
```
Proyecto Creado → Cronograma Comercial (Auto) → Cronograma Planificación (Manual) → Baseline (Manual) → Cronograma Ejecución (Manual)
```

## 🏗️ Arquitectura de Cronogramas

### **1. Cronograma Comercial**
- **Creación**: Automática al crear proyecto desde cotización
- **Propósito**: Referencia histórica de la cotización original
- **Permisos**: Solo lectura
- **Baseline**: Nunca puede ser baseline
- **Eliminación**: Prohibida

### **2. Cronograma de Planificación**
- **Creación**: Manual por el usuario
- **Propósito**: Trabajo de planificación detallada
- **Permisos**: Lectura/Escritura completa
- **Baseline**: Puede marcarse como baseline cuando esté listo
- **Límite**: Solo 1 por proyecto
- **Eliminación**: Permitida si no es baseline

### **3. Cronograma de Ejecución**
- **Creación**: Manual, solo después de tener baseline
- **Propósito**: Seguimiento de ejecución y registro de horas
- **Permisos**: Lectura/Escritura (solo horas y progreso)
- **Baseline**: Nunca puede ser baseline
- **Límite**: Solo 1 por proyecto
- **Origen**: Copia del cronograma baseline

## 🔧 Cambios Técnicos Requeridos

### **Backend - APIs**

#### **1. Modificar `/api/proyecto/from-cotizacion`**
```typescript
// ❌ Actual: Crea comercial + planificación
// ✅ Nuevo: Solo crea comercial
const cronogramaComercial = await prisma.proyectoCronograma.create({
  data: {
    proyectoId: proyecto.id,
    tipo: 'comercial',
    nombre: 'Cronograma Comercial',
    esBaseline: false, // Nunca baseline
    version: 1
  }
})
```

#### **2. Modificar `/api/proyectos/[id]/cronograma` (POST)**
```typescript
// ✅ Validar límites por tipo
if (tipo === 'planificacion') {
  const existing = await prisma.proyectoCronograma.count({
    where: { proyectoId: id, tipo: 'planificacion' }
  })
  if (existing > 0) throw new Error('Ya existe un cronograma de planificación')
}

if (tipo === 'ejecucion') {
  const baseline = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId: id, esBaseline: true }
  })
  if (!baseline) throw new Error('Debe existir un baseline para crear ejecución')
}
```

#### **3. Agregar endpoint `/api/proyectos/[id]/cronograma/[cronogramaId]/baseline`**
```typescript
// PUT: Marcar/desmarcar como baseline
// Solo planificación puede ser baseline
// Solo 1 baseline por proyecto
```

#### **4. Modificar operaciones CRUD**
```typescript
// ✅ Solo permitir operaciones en:
// - Cronograma de planificación (si existe)
// - Cronograma de ejecución (solo progreso/horas)
// ❌ Prohibir operaciones en comercial
```

### **Frontend - Componentes**

#### **1. Modificar `ProyectoCronogramaSelector`**
```typescript
// ✅ Mostrar estado de cada tipo:
// - Comercial: Siempre presente, read-only
// - Planificación: Crear si no existe, mostrar "Marcar como Baseline"
// - Ejecución: Crear solo si hay baseline, copiar desde baseline

// ✅ UI para marcar baseline:
// - Botón "Marcar como Baseline" en planificación
// - Badge "Baseline" solo en planificación
```

#### **2. Modificar `ProyectoCronogramaTreeView`**
```typescript
// ✅ Lógica de permisos:
// - Comercial: Vista solo lectura
// - Planificación: Vista completa CRUD
// - Ejecución: Vista con restricciones (solo progreso)
```

#### **3. Modificar `ProyectoCronogramaTab`**
```typescript
// ✅ Default tab: Vista Jerárquica
// ✅ Mostrar indicadores de permisos por cronograma
```

## 📊 Estados y Transiciones

### **Estados de Cronogramas**
```
Comercial:     Creado → Read-Only (permanente)
Planificación: Creado → En Edición → Baseline → Congelado
Ejecución:     No existe → Creado desde Baseline → En Ejecución
```

### **Reglas de Transición**
1. **Comercial**: No tiene transiciones, siempre read-only
2. **Planificación → Baseline**: Usuario marca manualmente
3. **Baseline → Ejecución**: Usuario crea cronograma de ejecución
4. **No reversas**: Una vez baseline, no se puede desmarcar

## 🔒 Reglas de Seguridad

### **Permisos por Tipo**
```typescript
const PERMISOS = {
  comercial: {
    read: true,
    create: false,
    update: false,
    delete: false
  },
  planificacion: {
    read: true,
    create: true,
    update: true,
    delete: !esBaseline
  },
  ejecucion: {
    read: true,
    create: true, // Solo si hay baseline
    update: 'progreso_only', // Solo horas y progreso
    delete: true
  }
}
```

### **Validaciones de Negocio**
1. **Solo 1 planificación por proyecto**
2. **Solo 1 ejecución por proyecto**
3. **Solo planificación puede ser baseline**
4. **Baseline no se puede eliminar**
5. **Comercial no se puede modificar**

## 🧪 Casos de Prueba

### **Escenario 1: Nuevo Proyecto**
1. Crear proyecto desde cotización
2. ✅ Se crea solo cronograma comercial
3. ❌ No se puede editar comercial
4. ✅ Se puede crear planificación

### **Escenario 2: Fase de Planificación**
1. Crear cronograma de planificación
2. ✅ Se puede editar completamente
3. ✅ Se puede marcar como baseline
4. ❌ No se puede crear ejecución sin baseline

### **Escenario 3: Fase de Ejecución**
1. Marcar planificación como baseline
2. ✅ Se puede crear cronograma de ejecución
3. ✅ Ejecución copia estructura del baseline
4. ✅ Baseline queda read-only

## 📋 Checklist de Implementación

### **Fase 1: Backend**
- [ ] Modificar creación automática de proyectos
- [ ] Agregar validaciones de límites por tipo
- [ ] Implementar endpoint de baseline
- [ ] Actualizar permisos en APIs CRUD

### **Fase 2: Frontend**
- [ ] Actualizar UI del selector de cronogramas
- [ ] Agregar controles de baseline
- [ ] Implementar lógica de permisos visual
- [ ] Actualizar indicadores de estado

### **Fase 3: Testing**
- [ ] Probar flujo completo
- [ ] Validar permisos
- [ ] Probar casos edge
- [ ] Verificar migración de datos existentes

## 🎯 Beneficios del Nuevo Diseño

1. **Simplicidad**: Flujo claro de 3 cronogramas con roles definidos
2. **Control**: Usuario decide cuándo marcar baseline
3. **Seguridad**: Reglas claras de permisos
4. **Escalabilidad**: Fácil agregar más tipos si se necesita
5. **Mantenibilidad**: Código más simple y predecible

## 🚀 Próximos Pasos

1. **Implementar cambios backend** (APIs)
2. **Actualizar frontend** (UI/UX)
3. **Testing exhaustivo** del flujo completo
4. **Documentación** para usuarios finales
5. **Migración** de datos existentes si es necesario

---

**Autor**: Sistema de IA Mejorado
**Fecha**: 2025-11-04
**Versión**: 1.0