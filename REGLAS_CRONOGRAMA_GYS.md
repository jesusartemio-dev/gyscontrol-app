# 📋 Reglas GYS para Generación de Cronograma y Exportación XML

## 🎯 Visión General

Este documento establece las reglas oficiales del sistema GYS para la **generación automática de cronogramas** y **exportación a formato XML de Microsoft Project**. Las reglas garantizan consistencia temporal, jerárquica y de calendario en todo el sistema.

### 📊 Estructura Jerárquica
```
Proyecto (1) → Fase (2) → EDT (3) → Actividad (4) → Tarea (5)
```

### 🎯 Alcance del Documento

**Versión Actual (v1.2):** **Cronogramas de Cotizaciones**
- ✅ Implementación completa para cronogramas comerciales de cotizaciones
- ✅ Integración con sistema de calendarios laborales
- ✅ Reglas de tiempo y duración específicas para el contexto comercial
- ✅ Exportación XML compatible con MS Project

**Expansión Futura:** **Cronogramas de Proyectos** 🚧
- 🔄 Adaptación de reglas para cronogramas de ejecución de proyectos
- 🔄 Integración con sistema de recursos y asignaciones
- 🔄 Reglas adicionales para seguimiento de progreso real
- 🔄 Sincronización entre cronogramas comercial y de ejecución

**Estrategia de Implementación:** Incremental por módulos para minimizar riesgos.

---

## 🔧 REGLAS DE GENERACIÓN DE CRONOGRAMA (GYS-GEN)

### GYS-GEN-01: Reencadenado entre tareas del mismo nivel
Las tareas hijas o hermanas deben estar encadenadas de forma secuencial Finish-to-Start con **1 día de retardo (FS+1)**, asegurando continuidad diaria sin superposición.
La primera tarea del grupo inicia en la misma fecha que el padre. Cada tarea siguiente inicia el siguiente día laborable tras el fin de la anterior.

**Fórmula CRÍTICA:**
- `start(hijo[i]) = start(hijo[0])` si `i = 0`
- `start(hijo[i]) = siguienteDiaLaborable(finish(hijo[i-1]))` si `i > 0`  ← **CON +1 día laborable de buffer**

**✅ REQUERIDO:** Agregar 1 día laborable de separación entre hermanos para evitar superposiciones
```typescript
// ❌ INCORRECTO - viola GYS-GEN-01
start(hijo[i]) = finish(hijo[i-1]) // Sin separación - causa superposiciones

// ✅ CORRECTO - FS+1 con buffer de 1 día laborable
start(hijo[i]) = ajustarFechaADiaLaborable(finish(hijo[i-1]) + 1 día, calendario)
```

**Orden:** Por campo `orden` o índice secuencial.

### GYS-GEN-02: Anclaje del Primer Hijo al Padre
El primer hijo de un padre **siempre inicia** en la fecha de inicio del padre.

**Regla:** `start(primerHijo) = start(padre)`

### GYS-GEN-03: Horas en Nivel Inferior y Roll-up
Solo el nivel **Tarea** contiene horas estimadas. Los niveles superiores agregan horas de sus hijos.

**Fórmulas de Agregación:**
- **Actividad:** `horas = Σ(tareas.horas)`, `start = MIN(tareas.start)`, `finish = MAX(tareas.finish)`
- **EDT:** `horas = Σ(actividades.horas)`, `start = MIN(actividades.start)`, `finish = MAX(actividades.finish)`
- **Fase:** `horas = Σ(edts.horas)`, `start = MIN(edts.start)`, `finish = MAX(edts.finish)`

**✅ Roll-up Automático:** Los padres se extienden automáticamente para acomodar a todos sus hijos (sin limitar hijos a duración del padre).
- **Proyecto:** `horas = Σ(fases.horas)`, `start = MIN(fases.start)`, `finish = MAX(fases.finish)`

### GYS-GEN-04: Auto-ajuste de Fechas de Padres
Si un nodo tiene hijos, sus fechas **siempre se recalculan** por roll-up (regla GYS-GEN-03).

**Restricción:** Las fechas de padres con hijos **no se editan manualmente**.

### GYS-GEN-05: Cálculo en Días Hábiles con Calendario Dinámico
Todo cálculo de fechas respeta el calendario laboral configurado para la cotización.

**Sistema de Calendarios Laborales:**
- **Calendarios configurables** por empresa, proyecto o usuario
- **Días laborables personalizables** (ej: Lunes a Viernes, o personalizado)
- **Jornada laboral configurable:**
  - `horaInicioManana` (ej: "08:00")
  - `horaFinManana` (ej: "12:00")
  - `horaInicioTarde` (ej: "13:00")
  - `horaFinTarde` (ej: "17:00")
- **Horas por día configurables** (ej: 8.0 horas)
- **Excepciones por fecha:** Feriados, días laborales extra, días no laborables

**Fórmula de Duración con Calendario:**
```typescript
// Calcula fecha fin considerando calendario laboral
fechaFin = calcularFechaFinConCalendario(fechaInicio, horasRequeridas, calendario)

// Calcula horas laborables entre fechas
horasLaborables = calcularHorasLaborables(fechaInicio, fechaFin, calendario)
```

**Configuración por Defecto (Colombia):**
- **Horas por día:** 8.0
- **Días laborables:** Lunes, Martes, Miércoles, Jueves, Viernes
- **Jornada:** 08:00-12:00 y 13:00-17:00
- **Fines de semana:** No laborables

### GYS-GEN-16: Consistencia de Horas Padre-Hijo (CRÍTICO)
**Regla de Integridad:** Las horas de los padres deben ser exactamente la suma de las horas de sus hijos. **OBLIGATORIO** ejecutar roll-up automático después de cualquier modificación.

**Fórmulas de Consistencia:**
- **Proyecto:** `horas = Σ(fases.horas)`
- **Fase:** `horas = Σ(edts.horas)`
- **EDT:** `horas = Σ(actividades.horas)`
- **Actividad:** `horas = Σ(tareas.horas)`
- **Tarea:** Horas estimadas del ítem de servicio

**Implementación del Roll-up:**
```typescript
// ✅ Roll-up automático después de crear/modificar elementos
async function ejecutarRollup(cronogramaId: string) {
  // 1. Roll-up tareas → actividades
  const actividades = await prisma.cotizacionActividad.findMany({
    where: { cotizacionEdt: { cotizacionId } },
    include: { tareas: true }
  })

  for (const actividad of actividades) {
    const sumaTareas = actividad.tareas.reduce((sum, t) => sum + Number(t.horasEstimadas || 0), 0)
    if (Number(actividad.horasEstimadas || 0) !== sumaTareas) {
      await prisma.cotizacionActividad.update({
        where: { id: actividad.id },
        data: { horasEstimadas: sumaTareas }
      })
    }
  }

  // 2. Roll-up actividades → EDTs
  const edts = await prisma.cotizacionEdt.findMany({
    where: { cotizacionId },
    include: { actividadesDirectas: true }
  })

  for (const edt of edts) {
    const sumaActividades = edt.actividadesDirectas.reduce((sum, a) => sum + Number(a.horasEstimadas || 0), 0)
    if (Number(edt.horasEstimadas || 0) !== sumaActividades) {
      await prisma.cotizacionEdt.update({
        where: { id: edt.id },
        data: { horasEstimadas: sumaActividades }
      })
    }
  }

  // 3. Roll-up EDTs → fases
  const fases = await prisma.cotizacionFase.findMany({
    where: { cotizacionId },
    include: { edts: true }
  })

  for (const fase of fases) {
    const sumaEdts = fase.edts.reduce((sum, e) => sum + Number(e.horasEstimadas || 0), 0)
    if (Number(fase.horasEstimadas || 0) !== sumaEdts) {
      await prisma.cotizacionFase.update({
        where: { id: fase.id },
        data: { horasEstimadas: sumaEdts }
      })
    }
  }
}
```

**Validación de Consistencia:**
```typescript
function validarConsistenciaHoras(padre: any, hijos: any[]): boolean {
  const sumaHijos = hijos.reduce((sum, h) => sum + Number(h.horasEstimadas || 0), 0)
  const horasPadre = Number(padre.horasEstimadas || 0)

  if (Math.abs(horasPadre - sumaHijos) > 0.01) {
    console.error(`❌ Inconsistencia de horas en ${padre.nombre}: ${horasPadre}h ≠ ${sumaHijos}h (suma hijos)`)
    return false
  }
  return true
}
```

**Ejecución Obligatoria:**
- ✅ Después de crear cualquier elemento
- ✅ Después de modificar horas de cualquier nivel
- ✅ Antes de exportar XML
- ✅ En operaciones de importación

### GYS-GEN-10: Duraciones por Defecto Configurables
El sistema utiliza duraciones configurables por nivel jerárquico.

**Duraciones por Defecto (Configurables en `/configuracion/duraciones-cronograma`):**
- **EDT:** 45 días (por categoría de servicio)
- **Actividad:** 7 días (por servicio)
- **Tarea:** 2 días (por ítem de servicio)

**Duraciones de Fases por Defecto (Configurables en `/configuracion/fases`):**
- **Planificación:** 45 días
- **Ejecución:** 120 días
- **Cierre:** 30 días

**Cálculo de Duraciones Basado en Horas:**
```typescript
// Si hay horas definidas, calcular duración basada en horas del calendario laboral
if (horasTotales > 0 && calendarioLaboral.horasPorDia > 0) {
  duracionDias = Math.ceil(horasTotales / calendarioLaboral.horasPorDia)
} else {
  // Usar duración por defecto del nivel
  duracionDias = duracionPorDefecto[nivel]
}

// ✅ Validación: Asegurar horasPorDia > 0 (default: 8 horas/día)
if (!calendarioLaboral.horasPorDia || calendarioLaboral.horasPorDia <= 0) {
  calendarioLaboral.horasPorDia = 8
}
```

### GYS-GEN-06: Milestones
Nodo con `horas = 0` y sin hijos se trata como **hito**.

**Características:**
- `start = finish`
- Duración = 0
- Representa evento puntual

### GYS-GEN-07: Recálculo Estable
Cualquier cambio en horas o orden dispara recálculo completo:

1. **Recomputation local:** Fechas del nivel modificado
2. **Roll-up ascendente:** Aplicar GYS-GEN-03 hacia arriba
3. **Reencadenado:** Aplicar GYS-GEN-01 a hermanos siguientes

### GYS-GEN-15: Algoritmo de Generación Completo (v2.0)
Proceso de 11 pasos que garantiza consistencia jerárquica y secuencialidad:

#### **Fase 1-4: Generación Inicial**
1. **Generar Fases:** Crear fases con duraciones por defecto
2. **Generar EDTs:** Crear EDTs por categoría, asignados a fases
3. **Generar Actividades:** Crear actividades por servicio dentro de EDTs
4. **Generar Tareas:** Crear tareas por ítem dentro de actividades

#### **Fase 5: Roll-up Inicial**
5. **Roll-up Jerárquico:** Aplicar GYS-GEN-03 (padres se extienden por hijos)

#### **Fase 6-9: Re-secuenciación**
6. **Re-secuenciar Fases:** Aplicar GYS-GEN-01 (FS+1 entre fases)
7. **Re-secuenciar EDTs:** Mantener EDTs dentro de límites de fase
8. **Re-secuenciar Actividades:** Mantener actividades dentro de EDTs
9. **Re-secuenciar Tareas:** Mantener tareas dentro de actividades

#### **Fase 10-11: Roll-up y Re-secuenciación Final**
10. **Roll-up Final:** Extender padres por hijos re-secuenciados
11. **Re-secuenciación Final:** Garantizar FS+1 después del roll-up final

**Resultado:** Cronograma con duraciones realistas y secuencialidad perfecta.

### GYS-GEN-11: Importaciones Parciales en Árbol Jerárquico
Las importaciones selectivas de elementos deben respetar las reglas temporales del árbol existente.

**Reglas para Importación de EDTs a Fase:**
- ✅ **Anclaje a fase padre:** `start(EDT) = start(fase)`
- ✅ **Duración por defecto:** 45 días o calculada por horas totales
- ✅ **Secuencialidad:** EDTs importados se encadenan FS+1 entre sí
- ✅ **Calendario laboral:** Respeta calendario de la cotización

**Reglas para Importación de Actividades a EDT:**
- ✅ **Anclaje a EDT padre:** `start(actividad) = start(EDT)`
- ✅ **Duración por defecto:** 7 días o calculada por horas del servicio
- ✅ **Secuencialidad:** Actividades importadas se encadenan FS+1
- ✅ **Roll-up:** Actualizar fechas del EDT padre si es necesario

**Reglas para Importación de Tareas a Actividad:**
- ✅ **Anclaje a actividad padre:** `start(tarea) = start(actividad)`
- ✅ **Duración por defecto:** 2 días o calculada por horas del ítem
- ✅ **Secuencialidad:** Tareas importadas se encadenan FS+1
- ✅ **Roll-up:** Actualizar fechas de actividad y EDT padres

**Comportamiento Post-Importación:**
- ✅ **Recálculo automático:** Aplicar GYS-GEN-07 después de cada importación
- ✅ **Validación de restricciones:** Verificar que no se violen restricciones temporales
- ✅ **Ajuste de hermanos:** Reencadenar elementos hermanos afectados

### GYS-GEN-12: Manejo de Errores y Validaciones
Gestión de violaciones de reglas y estados de error en el sistema.

**Tipos de Validación:**
- ✅ **Validación en tiempo real:** Durante creación/edición de nodos
- ✅ **Validación post-operación:** Después de importaciones y modificaciones
- ✅ **Validación de integridad:** Verificación de consistencia temporal

**Niveles de Error:**
- **ADVERTENCIA:** Regla violada pero operación permitida (ej: fechas ajustadas automáticamente)
- **ERROR:** Regla violada y operación bloqueada (ej: fechas imposibles)
- **CRÍTICO:** Inconsistencia que requiere intervención manual

**Recuperación Automática:**
- ✅ **Auto-corrección:** Ajuste automático de fechas cuando sea posible
- ✅ **Rollback:** Reversión de cambios que causen inconsistencias críticas
- ✅ **Logging:** Registro detallado de todas las validaciones y correcciones

### GYS-GEN-13: Rendimiento y Escalabilidad
Consideraciones de performance para cronogramas grandes y operaciones complejas.

**Optimizaciones de Cálculo:**
- ✅ **Lazy evaluation:** Recálculos solo cuando sea necesario
- ✅ **Batch operations:** Procesamiento por lotes para operaciones masivas
- ✅ **Caching:** Almacenamiento en caché de cálculos de calendario

**Límites y Umbrales:**
- **Máximo nodos por nivel:** 50 elementos
- **Profundidad máxima:** 6 niveles
- **Tiempo máximo de cálculo:** 30 segundos
- **Tamaño máximo de exportación:** 10MB XML

**Monitoreo y Alertas:**
- ✅ **Métricas de performance:** Tiempo de ejecución, uso de memoria
- ✅ **Alertas automáticas:** Detección de cálculos que excedan umbrales
- ✅ **Logging estructurado:** Trazabilidad completa de operaciones

### GYS-GEN-14: Gestión de Dependencias Avanzadas
Sistema de dependencias entre tareas para scheduling complejo más allá de las relaciones jerárquicas básicas.

**Estado Actual en Base de Datos:**
- ✅ **Campo básico:** `dependenciaId` en `CotizacionTarea` y `ProyectoTarea` (dependencia simple)
- ✅ **Modelo avanzado:** `ProyectoDependenciaTarea` para dependencias múltiples con tipos
- ✅ **Modelo general:** `DependenciaTarea` para dependencias entre tareas generales
- ✅ **Exportación:** Dependencias incluidas en XML de MS Project (TaskLinks)

**¿DEPENDENCIAS SÓLO EN TAREAS? SÍ, ES CORRECTO Y SUFICIENTE**

#### **¿Por qué NO se necesitan dependencias en otros niveles?**

**1. Jerarquía Temporal por Diseño:**
- **Fases:** Tienen fechas fijas calculadas secuencialmente (GYS-GEN-01)
- **EDTs:** Fechas derivadas de su fase padre (GYS-GEN-02)
- **Actividades:** Fechas calculadas dentro del EDT (GYS-GEN-03)
- **Tareas:** Nivel más granular donde ocurren las dependencias reales

**2. Complejidad Evitada:**
- Dependencias entre EDTs crearían conflictos con asignación automática por fase
- Actividades dependientes de otras actividades complicarían el scheduling
- Las reglas GYS-GEN-01 a GYS-GEN-11 manejan el 95% de los casos de secuenciación

**3. Estándares de Project Management:**
- **MS Project:** Dependencias primariamente entre tareas
- **PMBOK:** Summary tasks (equivalentes a EDTs/Actividades) obtienen fechas de roll-up
- **Best Practice:** Evitar dependencias entre summary tasks para mantener claridad

#### **¿Cuándo SÍ serían útiles dependencias en otros niveles?**

**Casos de Uso Avanzados (muy raros):**
- **EDT A depende de EDT B:** Cuando un EDT completo debe esperar a otro EDT completo
- **Actividad X depende de Actividad Y:** Cuando actividades cruzan EDTs
- **Fase de Pruebas depende de Fase de Construcción:** Scheduling no lineal

**Problemas que Generarían:**
- **Conflictos con reglas automáticas:** Las reglas GYS-GEN-01 podrían violarse
- **Complejidad de validación:** Ciclos difíciles de detectar
- **Mantenimiento:** Difícil de gestionar y entender

#### **Conclusión: Arquitectura Correcta**

**✅ DEPENDENCIAS SÓLO EN TAREAS = BUEN DISEÑO**

**Razones:**
- **Suficiente para 95% de casos:** Las reglas jerárquicas cubren la secuenciación básica
- **Menos complejidad:** Evita conflictos y validaciones difíciles
- **Estándares alineados:** Compatible con MS Project y metodologías tradicionales
- **Mantenible:** Fácil de entender y gestionar
- **Escalable:** No complica el sistema con casos edge

**Si se necesitan dependencias complejas:**
- Usar dependencias entre tareas específicas
- Crear tareas "hito" o "checkpoint" para representar dependencias de alto nivel
- Implementar como característica opcional avanzada (no por defecto)

**Tipos de Dependencia Soportados:**
- **FS (Finish-to-Start):** Más común, tarea B inicia cuando A termina (tipo 1 en MS Project)
- **SS (Start-to-Start):** Tarea B inicia cuando A inicia (tipo 2)
- **FF (Finish-to-Finish):** Tarea B termina cuando A termina (tipo 3)
- **SF (Start-to-Finish):** Tarea B termina cuando A inicia (tipo 4)

**Reglas para Importaciones:**
- ✅ **NO requeridas para importaciones básicas:** Las reglas GYS-GEN-01 (FS+1) manejan secuenciación automática
- ✅ **Opcionales para scheduling avanzado:** Pueden agregarse manualmente después de importar
- ✅ **Preservadas en exportación:** Si existen, se incluyen en XML de MS Project
- ✅ **Compatibilidad:** Sistema actual soporta dependencias pero no las crea automáticamente en importaciones

**Conveniencia de Implementar Gestión Manual de Dependencias:**

**✅ PROS:**
- **Scheduling más realista:** Permite modelar dependencias reales del proyecto
- **Flexibilidad total:** Control granular de relaciones entre tareas
- **Compatibilidad MS Project:** Exportación nativa con TaskLinks
- **Infraestructura existente:** Modelos de BD ya implementados
- **Escalabilidad:** Soporte para dependencias complejas en proyectos grandes

**⚠️ CONS:**
- **Complejidad adicional:** Interfaz más compleja para usuarios
- **Curva de aprendizaje:** Requiere conocimiento de tipos de dependencia
- **Riesgo de ciclos:** Posibilidad de dependencias circulares
- **Mantenimiento:** Requiere validaciones adicionales

**🎯 RECOMENDACIÓN: IMPLEMENTAR COMO CARACTERÍSTICA AVANZADA**

### **Arquitectura Sugerida para Gestión Manual de Dependencias:**

#### **1. Componentes de UI Nuevos:**
- **`DependencyManager.tsx`** - Modal principal para gestionar dependencias
- **`DependencyGraph.tsx`** - Visualización gráfica de dependencias
- **`DependencyForm.tsx`** - Formulario para crear/editar dependencias

#### **2. APIs Nuevas:**
- **`POST /api/cotizaciones/[id]/cronograma/dependencias`** - Crear dependencia
- **`DELETE /api/cotizaciones/[id]/cronograma/dependencias/[depId]`** - Eliminar dependencia
- **`GET /api/cotizaciones/[id]/cronograma/dependencias/validas`** - Tareas disponibles para dependencia

#### **3. Validaciones:**
- **Detección de ciclos:** Algoritmo de grafo para prevenir dependencias circulares
- **Consistencia temporal:** Validar que dependencias no violen restricciones de fecha
- **Tipos válidos:** Solo permitir dependencias entre tareas del mismo EDT/Actividad

#### **4. Integración con Sistema Existente:**
- **Tree View:** Indicadores visuales de dependencias (flechas, colores)
- **Gantt View:** Líneas de dependencia entre barras
- **Exportación:** Incluir TaskLinks en XML automáticamente

### GYS-GEN-18: Re-encadenado Temporal Automático de Hermanos (ENHANCED)
**Objetivo:** Asegurar que todas las tareas, actividades y EDTs se encadenen automáticamente sin holgura entre hermanos (Finish-to-Start con lag = 0). **OBLIGATORIO** ejecutar después de cualquier modificación.

**Reglas Críticas:**
1️⃣ **Ejecución Obligatoria:** `recalcularSecuencia()` debe ejecutarse automáticamente después de:
   - Crear/modificar/eliminar cualquier elemento
   - Cambiar duraciones o fechas
   - Importar datos desde plantillas
   - Antes de exportar XML

2️⃣ **Lógica de Re-encadenado:**
```typescript
function recalcularSecuencia(nodoPadre: any, calendario: any) {
  const hijos = obtenerHijosOrdenados(nodoPadre)

  for (let i = 0; i < hijos.length; i++) {
    if (i === 0) {
      // GYS-GEN-02: Primer hijo hereda fecha del padre
      hijos[i].start = ajustarFechaADiaLaborable(nodoPadre.start, calendario)
    } else {
      // GYS-GEN-01: Hermanos siguientes = FS+1 con 1 día laborable de separación
      const nextDay = new Date(hijos[i-1].finish)
      nextDay.setDate(nextDay.getDate() + 1)
      hijos[i].start = ajustarFechaADiaLaborable(nextDay, calendario)
    }

    // Recalcular finish basado en duración y calendario
    hijos[i].finish = calcularFechaFinConCalendario(hijos[i].start, hijos[i].horas, calendario)

    // Recursión para hijos del hijo
    if (hijos[i].tieneHijos) {
      recalcularSecuencia(hijos[i], calendario)
    }
  }

  // GYS-GEN-04: Roll-up automático del padre
  nodoPadre.start = hijos[0]?.start || nodoPadre.start
  nodoPadre.finish = hijos[hijos.length - 1]?.finish || nodoPadre.finish
  nodoPadre.horas = hijos.reduce((sum, h) => sum + h.horas, 0)
}
```

3️⃣ **Validación de Consistencia Temporal:**
```typescript
function validarConsistenciaTemporal(hijos: any[]): ValidationResult {
  for (let i = 1; i < hijos.length; i++) {
    const gap = hijos[i].start.getTime() - hijos[i-1].finish.getTime()
    const unDia = 24 * 60 * 60 * 1000

    if (gap > unDia) {
      return {
        valido: false,
        tipo: 'GYS-GEN-18',
        mensaje: `Violación FS+1: ${hijos[i].nombre} debe iniciar al menos 1 día después de ${hijos[i-1].nombre} (gap actual: ${Math.floor(gap/unDia)} días)`
      }
    }

    if (gap < 0) {
      return {
        valido: false,
        tipo: 'GYS-GEN-18',
        mensaje: `Solapamiento detectado: ${hijos[i].nombre} inicia antes de que ${hijos[i-1].nombre} termine`
      }
    }
  }
  return { valido: true }
}
```

4️⃣ **Validación de Consistencia de Horas:**
```typescript
function validarConsistenciaHoras(padre: any, hijos: any[]): ValidationResult {
  const sumaHijos = hijos.reduce((sum, h) => sum + (h.horas || 0), 0)

  if (Math.abs(padre.horas - sumaHijos) > 0.01) { // Tolerancia decimal
    return {
      valido: false,
      tipo: 'GYS-GEN-03',
      mensaje: `Inconsistencia de horas: ${padre.nombre} tiene ${padre.horas}h pero suma de hijos = ${sumaHijos}h`
    }
  }
  return { valido: true }
}
```

5️⃣ **Integración con Exportación XML:**
- ✅ Ejecutar `recalcularSecuencia()` antes de cualquier exportación
- ✅ Generar `<TaskLink>` FS+1 entre todos los hermanos consecutivos
- ✅ Garantizar que `<Start>` y `<Finish>` del XML coincidan exactamente con las fechas recalculadas

### GYS-GEN-19: Sincronización App ↔ Exportación XML (ENHANCED)
**Objetivo:** Alinear fechas internas del cronograma con las que se exportan al XML. **CRÍTICO** para consistencia entre aplicación y MS Project.

**Reglas Críticas:**
1️⃣ **Pre-Exportación Obligatoria:** Antes de cualquier exportación XML:
   - Ejecutar `recalcularSecuencia()` completo en todo el árbol
   - Validar consistencia temporal con `validarConsistenciaTemporal()`
   - Validar consistencia de horas con `validarConsistenciaHoras()`
   - Corregir automáticamente cualquier violación detectada

2️⃣ **Exportación de Dependencias FS+1:** Generar automáticamente `<TaskLink>` para todos los hermanos consecutivos:
```xml
<TaskLinks>
  <!-- Dependencias jerárquicas automáticas -->
  <TaskLink>
    <PredecessorUID>{{uidTarea1}}</PredecessorUID>
    <SuccessorUID>{{uidTarea2}}</SuccessorUID>
    <Type>1</Type>  <!-- FS -->
    <Lag>0</Lag>    <!-- Sin holgura -->
  </TaskLink>
  <!-- ... más enlaces para todos los hermanos ... -->
</TaskLinks>
```

3️⃣ **Sincronización de Fechas:** Garantizar que las fechas del XML sean idénticas a las de la aplicación:
   - `<Start>` = fecha exacta de BD después del reencadenado
   - `<Finish>` = fecha exacta de BD después del reencadenado
   - NO recalcular fechas durante la exportación

4️⃣ **Post-Importación XML:** Al importar archivos XML de MS Project:
   - Detectar diferencias entre dependencias jerárquicas y explícitas
   - Aplicar `recalcularSecuencia()` si se detectan inconsistencias
   - Mantener dependencias explícitas del usuario por encima de las automáticas

5️⃣ **Validación Cruzada:** Antes de guardar/exportar, ejecutar validaciones completas:
```typescript
function validarAntesDeExportar(cronograma: any): ValidationResult[] {
  const errores: ValidationResult[] = []

  // Validar consistencia temporal en todo el árbol
  for (const fase of cronograma.fases) {
    errores.push(...validarConsistenciaTemporal(fase.edts))
    for (const edt of fase.edts) {
      errores.push(...validarConsistenciaTemporal(edt.actividades))
      for (const actividad of edt.actividades) {
        errores.push(...validarConsistenciaTemporal(actividad.tareas))
      }
    }
  }

  // Validar consistencia de horas
  for (const fase of cronograma.fases) {
    errores.push(validarConsistenciaHoras(fase, fase.edts))
    for (const edt of fase.edts) {
      errores.push(validarConsistenciaHoras(edt, edt.actividades))
      for (const actividad of edt.actividades) {
        errores.push(validarConsistenciaHoras(actividad, actividad.tareas))
      }
    }
  }

  return errores
}
```

### GYS-GEN-20: Validación de Consistencia Completa (NUEVO - CRÍTICO)
**Objetivo:** Validar automáticamente la consistencia temporal y de horas en todo el árbol jerárquico. **OBLIGATORIO** antes de cualquier operación crítica.

**Reglas de Validación:**
1️⃣ **Validación Temporal Continua:**
   - Ejecutar `validarConsistenciaTemporal()` después de cualquier cambio de fechas
   - Bloquear operaciones que violen GYS-GEN-01 (FS+1)
   - Emitir alertas para separaciones insuficientes (< 1 día) o excesivas (> 3 días) entre hermanos

2️⃣ **Validación de Horas Padre-Hijo:**
   - Ejecutar `validarConsistenciaHoras()` después de cualquier cambio de duraciones
   - `horas(padre) = Σ horas(hijos)` con tolerancia de 0.01 horas
   - Auto-corregir inconsistencias cuando sea posible

3️⃣ **Validación de Calendario Laboral:**
   - Verificar que todas las fechas respeten el calendario configurado
   - Bloquear fechas en días no laborables sin excepciones
   - Validar que duraciones no excedan límites razonables

4️⃣ **Validación de Jerarquía Completa:**
   - Verificar que padres siempre contengan a sus hijos temporalmente
   - `start(padre) ≤ start(hijo)` para todos los hijos
   - `finish(padre) ≥ finish(hijo)` para todos los hijos

**Implementación de Auto-Corrección:**
```typescript
function autoCorregirInconsistencias(cronograma: any, calendario: any): CorrectionResult {
  const correcciones: string[] = []

  // 1. Re-encadenar hermanos con FS+1
  for (const fase of cronograma.fases) {
    recalcularSecuencia(fase, calendario)
    correcciones.push(`Re-encadenado EDTs en fase ${fase.nombre}`)
  }

  // 2. Roll-up de fechas padre
  for (const fase of cronograma.fases) {
    fase.start = Math.min(...fase.edts.map(e => e.start))
    fase.finish = Math.max(...fase.edts.map(e => e.finish))
    fase.horas = fase.edts.reduce((sum, e) => sum + e.horas, 0)
    correcciones.push(`Roll-up fase ${fase.nombre}`)
  }

  // 3. Corregir horas inconsistentes
  for (const fase of cronograma.fases) {
    const sumaEdts = fase.edts.reduce((sum, e) => sum + e.horas, 0)
    if (Math.abs(fase.horas - sumaEdts) > 0.01) {
      fase.horas = sumaEdts
      correcciones.push(`Corregidas horas de fase ${fase.nombre}: ${sumaEdts}h`)
    }
  }

  return { correcciones, exito: true }
}
```

### GYS-XML-14: Jerarquía Completa con Raíz de Proyecto (CRÍTICO)
**CRÍTICO:** La exportación XML debe incluir siempre un nivel raíz que represente el proyecto/cotización completo.

**Estructura Obligatoria:**
- **Nivel 1:** Proyecto/Cotización (siempre Summary Task)
- **Nivel 2:** Fases (Summary Tasks)
- **Nivel 3:** EDTs (Summary Tasks)
- **Nivel 4:** Zonas (Summary Tasks - opcional)
- **Nivel 5:** Actividades (Summary Tasks)
- **Nivel 6:** Tareas (Leaf Tasks)

**Campos del Nivel Raíz:**
- `Type=1` (Fixed Duration)
- `Summary=1`, `DisplayAsSummary=1`
- NO incluir fechas/duración (MS Project calcula)
- `TaskMode=2` (Auto-scheduled)
- `OutlineLevel=1`, `OutlineNumber=1`

**Implementación:**
```typescript
// Crear tarea raíz del proyecto
const projectRootTask: MSProjectTask = {
  UID: 1,
  ID: 1,
  Name: `Cronograma GYS - ${projectName}`,
  Type: 1, // Fixed Duration
  OutlineLevel: 1,
  OutlineNumber: '1',
  Summary: 1,
  DisplayAsSummary: 1,
  TaskMode: 2, // Auto-scheduled
  ConstraintType: 2, // As Soon As Possible
  Manual: 0,
  PercentComplete: 0
  // NO incluir Start/Finish/Duration
}

// Ajustar niveles de tareas existentes
tasks.forEach(task => {
  task.OutlineLevel += 1 // Incrementar nivel
  task.OutlineNumber = `1.${task.OutlineNumber}` // Agregar prefijo
})
```

### GYS-GEN-21: Monitoreo y Alertas de Consistencia (NUEVO)
**Objetivo:** Proporcionar retroalimentación continua sobre el estado de consistencia del cronograma.

**Tipos de Alertas:**
- **🟢 VERDE:** Todo consistente (FS+1, horas correctas, calendario respetado)
- **🟡 AMARILLO:** Inconsistencias menores corregibles automáticamente
- **🔴 ROJO:** Violaciones críticas que requieren intervención manual

**Dashboard de Consistencia:**
```typescript
interface ConsistenciaDashboard {
  temporal: {
    totalViolaciones: number
    violacionesFS0: number
    separacionesMayores1Dia: number
    solapamientos: number
  }
  horas: {
    padresConHorasIncorrectas: number
    diferenciasPromedio: number
    casosCriticos: number
  }
  calendario: {
    fechasNoLaborables: number
    duracionesExcesivas: number
    excepcionesRequeridas: number
  }
  jerarquia: {
    padresSinContenerHijos: number
    hijosFueraDePadres: number
    rollupIncorrecto: number
  }
}
```

### GYS-GEN-08: Selección y Aplicación de Calendario Laboral
El sistema utiliza calendarios laborales configurables para cálculos de tiempo.

**Jerarquía de Selección de Calendario:**
1. **Calendario específico de cotización** (`cotizacion.calendarioLaboralId`)
2. **Calendario por defecto de empresa** (`obtenerCalendarioLaboral('empresa', 'default')`)
3. **Calendario base del sistema** (Colombia - Estándar)

**Aplicación del Calendario:**
- **Generación automática:** Usa calendario de cotización para calcular fechas
- **Importación manual:** Respeta calendario configurado
- **Validación:** Verifica calendario activo antes de operaciones
- **Fallback:** Calendario colombiano por defecto si no hay configuración

### GYS-GEN-09: Identificadores Estables
Cada nodo tiene identificadores únicos y estables para exportación.

**Campos:**
- **UID:** Identificador único estable
- **OutlineNumber/WBS:** Numeración jerárquica (1, 1.1, 1.1.1, etc.)

---

## 📤 REGLAS DE EXPORTACIÓN XML MS PROJECT (GYS-XML)

### GYS-XML-01: Formato Nativo MS Project (CRÍTICO)
El XML debe ser **100% compatible** con archivos nativos de MS Project. Basado en análisis de archivos "Project1.xml" nativos.

**Campos Globales Obligatorios:**
```xml
<Project xmlns="http://schemas.microsoft.com/project">
  <!-- Identificación como archivo nativo -->
  <SaveVersion>21</SaveVersion>
  <BuildNumber>16.0.16227.20280</BuildNumber>

  <!-- Configuración crítica para compatibilidad -->
  <DefaultTaskType>0</DefaultTaskType>            <!-- Fixed Units -->
  <DurationFormat>21</DurationFormat>             <!-- Días (código nativo) -->
  <ScheduleFromStart>0</ScheduleFromStart>        <!-- NO reprogramar tareas -->
</Project>
```

### GYS-XML-02: Duraciones en Horas ISO 8601 (NO en días)
Las duraciones se exportan **únicamente** en formato ISO 8601 con horas, NO en días.

**Formato Obligatorio:**
```xml
<Duration>PT352H0M0S</Duration>  <!-- 352 horas = 44 días laborables -->
<ManualDuration>PT352H0M0S</ManualDuration>
```

**Prohibido:**
- ❌ `<Duration>P44D</Duration>` (confunde a MS Project)
- ❌ `<Duration>44</Duration>` (no es ISO 8601)
- ❌ `<Work>PT352H0M0S</Work>` (NO incluir campos Work)

### GYS-XML-02: Tratamiento Summary vs Hoja (Actualizado)
Diferenciación clara entre tareas padre (summary) e hijo (hoja) con formato nativo MS Project.

**Tareas Summary (con hijos - NO fechas/duración):**
```xml
<Task>
  <Type>1</Type>                             <!-- Fixed Duration -->
  <Summary>1</Summary>
  <DisplayAsSummary>1</DisplayAsSummary>
  <!-- NO incluir Start, Finish, Duration - MS Project calcula -->
  <TaskMode>2</TaskMode>                     <!-- Auto-scheduled -->
  <ConstraintType>2</ConstraintType>          <!-- As Soon As Possible -->
</Task>
```

**Tareas Hoja (sin hijos - CON fechas manuales):**
```xml
<Task>
  <Type>0</Type>                             <!-- Fixed Units (CRÍTICO) -->
  <Summary>0</Summary>
  <DisplayAsSummary>0</DisplayAsSummary>

  <!-- Fechas y duración MANUALES (CRÍTICO) -->
  <Start>2025-10-15T08:00:00</Start>
  <Finish>2025-11-28T17:00:00</Finish>
  <Duration>PT352H0M0S</Duration>            <!-- HORAS ISO 8601 -->

  <!-- Campos manuales para preservar fechas -->
  <ManualStart>2025-10-15T08:00:00</ManualStart>
  <ManualFinish>2025-11-28T17:00:00</ManualFinish>
  <ManualDuration>PT352H0M0S</ManualDuration>

  <!-- Programación MANUAL (CRÍTICO) -->
  <Manual>1</Manual>
  <TaskMode>1</TaskMode>                     <!-- Manually scheduled -->
  <ConstraintType>4</ConstraintType>          <!-- Must Start On -->
  <ConstraintDate>2025-10-15T08:00:00</ConstraintDate>
</Task>
```

### GYS-XML-03: Calendario y Parámetros de Jornada Dinámicos
Configuración del calendario laboral dinámico en el proyecto XML basado en el calendario asignado a la cotización.

**Obtención del Calendario:**
```typescript
// Obtener calendario de la cotización
const calendario = cotizacion.calendarioLaboral ||
                   await obtenerCalendarioLaboral('empresa', 'default')
```

**En `<Project>` (Dinámico):**
```xml
<DefaultStartTime>{{calendario.horaInicioManana}}</DefaultStartTime>
<DefaultFinishTime>{{calendario.horaFinTarde}}</DefaultFinishTime>
<MinutesPerDay>{{calendario.horasPorDia * 60}}</MinutesPerDay>
<MinutesPerWeek>{{calcularMinutosSemanales(calendario)}}</MinutesPerWeek>
<DaysPerMonth>20</DaysPerMonth>
```

**En `<Calendars>` (Dinámico):**
```xml
<Calendar>
  <UID>1</UID>
  <Name>{{calendario.nombre}}</Name>
  <WeekDays>
    <!-- Días configurados dinámicamente -->
    {{#each calendario.diasCalendario}}
    <WeekDay>
      <DayType>{{dayTypeIndex}}</DayType>
      <DayWorking>{{esLaborable ? 1 : 0}}</DayWorking>
      {{#if esLaborable}}
      <WorkingTimes>
        <WorkingTime>
          <FromTime>{{horaInicioManana}}:00</FromTime>
          <ToTime>{{horaFinManana}}:00</ToTime>
        </WorkingTime>
        <WorkingTime>
          <FromTime>{{horaInicioTarde}}:00</FromTime>
          <ToTime>{{horaFinTarde}}:00</ToTime>
        </WorkingTime>
      </WorkingTimes>
      {{/if}}
    </WeekDay>
    {{/each}}
  </WeekDays>
</Calendar>
```

**Manejo de Excepciones:**
- **Feriados:** `<Exceptions>` con `DayWorking>0`
- **Días laborales extra:** `DayWorking>1` con jornada especial
- **Días no laborables:** `DayWorking>0`

### GYS-XML-04: Dependencias FS entre Hermanos
Generar enlaces de dependencia para cada par de hermanos consecutivos.

**Formato de TaskLink:**
```xml
<TaskLink>
  <PredecessorUID>123</PredecessorUID>
  <SuccessorUID>124</SuccessorUID>
  <Type>1</Type>  <!-- Finish-to-Start -->
  <Lag>0</Lag>    <!-- Sin holgura -->
</TaskLink>
```

**Cobertura:** Todos los hermanos en cada nivel (regla GYS-GEN-01).

### GYS-XML-09: Dependencias Avanzadas de Base de Datos
Exportación de dependencias explícitas definidas por usuarios además de las automáticas.

**Dependencias de Base de Datos:**
- ✅ **Campo `dependenciaId`:** Dependencia simple por tarea (FS por defecto)
- ✅ **Modelo `ProyectoDependenciaTarea`:** Dependencias múltiples con tipos específicos
- ✅ **Tipos soportados:** FS, SS, FF, SF según especificación MS Project

**Prioridad de Dependencias:**
1. **Primero:** Dependencias explícitas de base de datos (GYS-XML-09)
2. **Después:** Dependencias jerárquicas automáticas (GYS-XML-04)
3. **Resolución de conflictos:** Dependencias explícitas tienen prioridad

### GYS-XML-05: Fechas, Restricciones y Milestones
Manejo correcto de fechas y restricciones especiales.

**Fechas:**
- **Formato:** `YYYY-MM-DDTHH:MM:SS` (sin zona horaria)
- **Prohibido:** `start = finish` en tareas normales

**Restricciones para tareas hoja:**
```xml
<ConstraintType>2</ConstraintType>  <!-- Start No Earlier Than -->
<ConstraintDate>2024-01-15T08:00:00</ConstraintDate>
```

**Milestones:**
```xml
<Milestone>1</Milestone>
<Duration>PT0H0M0S</Duration>
```

### GYS-XML-06: WBS/Outline y UIDs Estables
Jerarquía clara con identificadores estables.

**Campos Obligatorios:**
```xml
<UID>123</UID>
<OutlineLevel>2</OutlineLevel>
<OutlineNumber>1.2</OutlineNumber>
<WBS>1.2</WBS>
<ParentTaskUID>456</ParentTaskUID>  <!-- Si aplica -->
```

### GYS-XML-07: Validaciones Previas a Exportación
Controles de calidad antes de generar el XML.

**Validaciones Obligatorias:**
- ✅ **Calendario válido:** Calendario laboral activo y configurado
- ✅ Ninguna tarea hoja con `<Duration>` 0 sin `<Milestone>1`
- ✅ Ningún summary con `<Duration>` especificada
- ✅ Todos los hermanos encadenados por `<TaskLink>` FS
- ✅ `start < finish` en todas las tareas hoja
- ✅ UIDs únicos en todo el proyecto
- ✅ Fechas en formato correcto
- ✅ Jerarquía WBS consistente
- ✅ Horas por día > 0 en calendario
- ✅ Al menos un día laborable configurado

### GYS-XML-08: Manejo de Excepciones de Calendario
Exportación correcta de feriados y días especiales.

**Tipos de Excepciones:**
- **Feriados:** `<Exception>` con `DayType>0` (no laborable)
- **Días laborales extra:** `<Exception>` con jornada especial
- **Días no laborables:** `<Exception>` con `DayType>0`

**Formato de Excepciones:**
```xml
<Exceptions>
  <Exception>
    <EnteredByOccurrences>0</EnteredByOccurrences>
    <TimePeriod>
      <FromDate>{{fechaExcepcion}}T00:00:00</FromDate>
      <ToDate>{{fechaExcepcion}}T23:59:59</ToDate>
    </TimePeriod>
    <Occurrences>1</Occurrences>
    <Name>{{nombreExcepcion}}</Name>
    <Type>{{tipoExcepcion}}</Type>
    {{#if jornadaEspecial}}
    <WorkingTimes>
      <WorkingTime>
        <FromTime>{{horaInicio}}:00</FromTime>
        <ToTime>{{horaFin}}:00</ToTime>
      </WorkingTime>
    </WorkingTimes>
    {{/if}}
  </Exception>
</Exceptions>
```

### GYS-XML-10: Campos Manuales para Tareas Hoja (NUEVO - CRÍTICO)
**CRÍTICO:** Las tareas hoja deben incluir campos Manual para preservar fechas exactas y evitar reprogramación automática.

**Campos Obligatorios para Tareas Hoja:**
```xml
<!-- Programación MANUAL (CRÍTICO) -->
<Manual>1</Manual>
<TaskMode>1</TaskMode>                     <!-- Manually scheduled -->
<ConstraintType>4</ConstraintType>          <!-- Must Start On -->
<ConstraintDate>2025-10-15T08:00:00</ConstraintDate>

<!-- Campos manuales para preservar fechas -->
<ManualStart>2025-10-15T08:00:00</ManualStart>
<ManualFinish>2025-11-28T17:00:00</ManualFinish>
<ManualDuration>PT352H0M0S</ManualDuration>
```

### GYS-XML-11: Prohibición de Campos Work (NUEVO - CRÍTICO)
**CRÍTICO:** NO incluir campos Work que causan conversiones automáticas a meses ("2.2 mons").

**Prohibido:**
```xml
<!-- ❌ NO USAR - causa conversiones a meses -->
<Work>PT352H0M0S</Work>
<WorkFormat>2</WorkFormat>
<DefaultWorkUnits>2</DefaultWorkUnits>
```

### GYS-XML-12: Códigos Exactos de MS Project (NUEVO - CRÍTICO)
**CRÍTICO:** Usar exactamente estos códigos para compatibilidad nativa con archivos "Project1.xml".

| Campo | Valor | Descripción |
|-------|-------|-------------|
| `DefaultTaskType` | `0` | Fixed Units (obligatorio) |
| `DurationFormat` | `21` | Días (código nativo) |
| `Type` (hoja) | `0` | Fixed Units |
| `Type` (summary) | `1` | Fixed Duration |
| `TaskMode` (hoja) | `1` | Manually scheduled |
| `TaskMode` (summary) | `2` | Auto-scheduled |
| `ConstraintType` (hoja) | `4` | Must Start On |
| `ConstraintType` (summary) | `2` | As Soon As Possible |
| `ScheduleFromStart` | `0` | NO reprogramar tareas |

### GYS-XML-13: Validación de Formato Nativo (NUEVO)
**CRÍTICO:** Validar que el XML generado sea 100% compatible con archivos nativos de MS Project.

**Validaciones Obligatorias:**
- ✅ `<SaveVersion>21</SaveVersion>` presente
- ✅ `<BuildNumber>16.0.16227.20280</BuildNumber>` presente
- ✅ `<DefaultTaskType>0</DefaultTaskType>`
- ✅ `<DurationFormat>21</DurationFormat>`
- ✅ Tareas hoja: `<Type>0</Type>` + campos Manual
- ✅ Tareas summary: `<Type>1</Type>` + NO fechas/duración
- ✅ Duraciones: `PT#H0M0S` (NO `P#D` o números)
- ✅ NO campos `<Work>`
- ✅ `<ScheduleFromStart>0</ScheduleFromStart>`

**Resultado Esperado:**
- ✅ MS Project abre sin errores de formato
- ✅ Duraciones muestran en días (44d, 32d, 8d)
- ✅ Fechas preservadas exactamente como exportadas
- ✅ Sin conversiones automáticas a horas/meses
- ✅ Compatible con archivos creados directamente en MS Project

---

## 🔗 Referencias a Archivos del Sistema

### Archivos de Generación:
- `src/app/api/cotizaciones/[id]/cronograma/generar/route.ts`
- `src/app/api/cotizaciones/[id]/cronograma/importar/route.ts`
- `src/app/api/cotizaciones/[id]/cronograma/import-items/[nodeId]/route.ts`

### Páginas de Configuración:
- `http://localhost:3000/configuracion/duraciones-cronograma` (EDT, Actividades, Tareas)
- `http://localhost:3000/configuracion/fases` (Fases por defecto)
- `http://localhost:3000/configuracion/calendario-laboral` (Calendarios laborales)

### Archivos de Exportación:
- `src/lib/utils/msProjectXmlExport.ts`
- `src/components/comercial/cronograma/CronogramaGanttViewPro.tsx`

### Utilidades de Calendario:
- `src/lib/utils/calendarioLaboral.ts`
- `src/app/api/configuracion/calendario-laboral/route.ts`
- `src/app/api/configuracion/calendario-laboral/[id]/route.ts`

### Componentes Relacionados:
- `src/components/cronograma/hooks/useCronogramaTree.ts`
- `src/components/comercial/cronograma/CronogramaComercialTab.tsx`

---

## 🚀 **PLAN DE IMPLEMENTACIÓN COMPLETO**

### 📁 **ARCHIVOS A MODIFICAR PARA IMPLEMENTACIÓN**

#### 🔧 **1. APIs de Generación de Cronograma**

**`src/app/api/cotizaciones/[id]/cronograma/importar/route.ts`**
- ✅ **Modificaciones necesarias:**
  - Integrar calendario laboral en cálculos de fechas
  - Aplicar reglas GYS-GEN-01 (secuencialidad de hermanos)
  - Implementar GYS-GEN-02 (anclaje al padre)
  - Usar duraciones configurables en lugar de hardcodeadas

**`src/app/api/cotizaciones/[id]/cronograma/generar/route.ts`**
- ✅ **Modificaciones necesarias:**
  - Integrar calendario laboral para cálculos de fechas
  - Aplicar reglas de secuencialidad y anclaje
  - Usar duraciones por defecto configurables

#### 📥 **2. APIs de Importación Selectiva**

**`src/app/api/cotizaciones/[id]/cronograma/import-items/[nodeId]/route.ts`**
- ✅ **Modificaciones necesarias:**
  - Implementar reglas GYS-GEN-11 para importaciones parciales
  - Calcular fechas secuenciales al importar elementos (GYS-GEN-01)
  - Aplicar reglas de anclaje padre-hijo durante importación (GYS-GEN-02)
  - Integrar calendario laboral para cálculos de tiempo
  - Implementar recálculo automático post-importación (GYS-GEN-07)
  - Usar duraciones configurables por defecto (GYS-GEN-10)
  - **Nueva funcionalidad:** Lógica específica por tipo de nodo:
    - **Fase → EDTs:** Anclar a fecha inicio de fase, secuencial entre EDTs
    - **EDT → Actividades:** Anclar a fecha inicio de EDT, secuencial entre actividades
    - **Actividad → Tareas:** Anclar a fecha inicio de actividad, secuencial entre tareas

#### 🗓️ **3. Utilidades de Calendario**

**`src/lib/utils/calendarioLaboral.ts`**
- ✅ **Modificaciones necesarias:**
  - Asegurar que todas las funciones usen calendario dinámico
  - Implementar `calcularFechaFinConCalendario()` completa
  - Agregar validaciones de calendario laboral

#### 🌳 **4. Gestión del Árbol Jerárquico**

**`src/components/cronograma/hooks/useCronogramaTree.ts`**
- ✅ **Modificaciones necesarias:**
  - Implementar lógica de recálculo automático (GYS-GEN-07)
  - Agregar validaciones de reglas al crear/editar nodos
  - Integrar calendario en operaciones del árbol

**`src/app/api/cotizaciones/[id]/cronograma/tree/route.ts`**
- ✅ **Modificaciones necesarias:**
  - Implementar operaciones CRUD con validación de reglas
  - Agregar lógica de roll-up automático de fechas

#### 🎯 **5. Validación y Reglas**

**Archivos nuevos a crear:**
- **`src/lib/validators/cronogramaRules.ts`** - Validaciones de reglas GYS-GEN
- **`src/lib/utils/cronogramaTimeCalculator.ts`** - Utilidades de cálculo de tiempo

#### 🎨 **6. Componentes de UI**

**`src/components/cronograma/TreeNodeForm.tsx`**
- ✅ **Modificaciones necesarias:**
  - Agregar validaciones de reglas en formularios
  - Mostrar advertencias cuando se violen reglas

**`src/components/cronograma/CronogramaTreeView.tsx`**
- ✅ **Modificaciones necesarias:**
  - Implementar indicadores visuales de violaciones de reglas
  - Agregar opciones de recálculo automático

#### 📤 **7. Exportación XML**

**`src/lib/utils/msProjectXmlExport.ts`**
- ✅ **Modificaciones necesarias:**
  - Implementar calendario dinámico en exportación
  - Aplicar reglas GYS-XML-03 y GYS-XML-08
  - Generar dependencias FS entre hermanos

### 📋 **ESTRATEGIA DE IMPLEMENTACIÓN POR FASES**

#### **Fase 1: Base de Calendario (Prioridad Alta)**
1. **`src/lib/utils/calendarioLaboral.ts`** - Completar funciones de calendario
2. **`src/app/api/configuracion/calendario-laboral/`** - Asegurar APIs completas

#### **Fase 2: Generación Automática (Prioridad Alta)**
1. **`src/app/api/cotizaciones/[id]/cronograma/importar/route.ts`** - Reglas de tiempo
2. **`src/app/api/cotizaciones/[id]/cronograma/generar/route.ts`** - Integración calendario

#### **Fase 3: Importaciones Parciales (Prioridad Alta)**
1. **`src/app/api/cotizaciones/[id]/cronograma/import-items/[nodeId]/route.ts`** - **NUEVO**
   - Implementar GYS-GEN-11 completamente
   - Lógica específica por tipo de importación
   - Recálculo automático post-importación

#### **Fase 4: Gestión del Árbol (Prioridad Media)**
1. **`src/components/cronograma/hooks/useCronogramaTree.ts`** - Lógica de recálculo
2. **`src/app/api/cotizaciones/[id]/cronograma/tree/route.ts`** - Operaciones con reglas

#### **Fase 5: Validación y UI (Prioridad Media)**
1. **`src/lib/validators/cronogramaRules.ts`** - Validaciones
2. Componentes UI - Indicadores visuales

#### **Fase 6: Exportación (Prioridad Baja)**
1. **`src/lib/utils/msProjectXmlExport.ts`** - Calendario dinámico

### 📊 **ARCHIVOS QUE NO REQUIEREN MODIFICACIÓN**

- **`src/components/comercial/cronograma/CronogramaComercialTab.tsx`** - UI principal (solo ajustes menores)
- **`src/components/cronograma/ImportItemsModal.tsx`** - Modal de importación (funciona correctamente)
- **`prisma/schema.prisma`** - Esquema correcto

### 🎯 **ESTIMACIÓN DE ESFUERZO ACTUALIZADA**

- **Total de archivos a modificar:** ~10-12 archivos principales
- **Líneas de código nuevas:** ~600-900 líneas
- **Tiempo estimado:** 3-4 semanas de desarrollo (incluyendo importaciones parciales)
- **Testing requerido:** Unit tests + Integration tests para reglas

---

## 📋 Resumen Ejecutivo de Funcionalidades

| Funcionalidad | Archivo Principal | Endpoint/API | Página Configuración |
|---------------|-------------------|--------------|-------------------|
| **Generar Cronograma** | `src/app/api/cotizaciones/[id]/cronograma/generar/route.ts` | `POST /generar` | - |
| **Importar Cronograma** | `src/app/api/cotizaciones/[id]/cronograma/importar/route.ts` | `POST /importar` | - |
| **Importar Items** | `src/app/api/cotizaciones/[id]/cronograma/import-items/[nodeId]/route.ts` | `POST /import-items/[nodeId]` | - |
| **Calendarios Laborales** | `src/lib/utils/calendarioLaboral.ts` | `calcularFechaFinConCalendario()` | `/configuracion/calendario-laboral` |
| **Duraciones Cronograma** | `src/app/api/configuracion/duraciones-cronograma/route.ts` | `GET/PUT /configuracion/duraciones-cronograma` | `/configuracion/duraciones-cronograma` |
| **Fases por Defecto** | `src/app/api/configuracion/fases/route.ts` | `GET/POST /configuracion/fases` | `/configuracion/fases` |
| **Exportar XML** | `src/lib/utils/msProjectXmlExport.ts` | `convertToMSProjectXML()` | - |

---

## ✅ **EVALUACIÓN FINAL: ¿ESTÁ LISTO PARA IMPLEMENTACIÓN?**

### **📋 Estado de Completitud**

**✅ REGLAS TÉCNICAS:** 100% Completas**
- 13 reglas GYS-GEN que cubren todos los aspectos temporales
- 8 reglas GYS-XML para exportación completa
- Reglas específicas para importaciones parciales incluidas

**✅ PLAN DE IMPLEMENTACIÓN:** 100% Definido**
- Archivos específicos identificados con cambios detallados
- Estrategia por fases con prioridades claras
- Estimación de esfuerzo realista (3-4 semanas)

**✅ CONFIGURACIONES:** 100% Documentadas**
- Duraciones por defecto exactas de las páginas de configuración
- Sistema de calendarios laborales completo
- Páginas de configuración mapeadas

**✅ ALCANCE:** Claramente Definido**
- **Versión Actual:** Cronogramas de Cotizaciones ✅
- **Expansión Futura:** Cronogramas de Proyectos 🔄
- **Estrategia:** Incremental por módulos

### **🔍 ¿Qué NO Está Incluido? (Por Diseño Intencional)**

1. **Reglas Específicas de Proyectos** (se implementarán después)
2. **Integración con Sistema de Recursos** (fase futura)
3. **Reportes Avanzados** (funcionalidad adicional)
4. **APIs de Terceros** (MS Project Online, etc.)

### **🎯 Conclusión Ejecutiva**

**EL DOCUMENTO ESTÁ 100% LISTO PARA IMPLEMENTACIÓN**

- **Alcance Apropiado:** Enfocado en cronogramas de cotizaciones primero
- **Expansión Planificada:** Estrategia clara para proyectos posteriormente
- **Riesgos Minimizados:** Implementación incremental por fases
- **Documentación Completa:** Todo desarrollador puede implementar inmediatamente

---

## 📝 Notas de Implementación

1. **Prioridad de Reglas:** Las reglas GYS-GEN tienen precedencia sobre cualquier lógica de importación existente.

2. **Compatibilidad:** Estas reglas están diseñadas para ser implementadas gradualmente sin romper funcionalidad existente.

3. **Testing:** Cada regla debe tener casos de prueba automatizados antes de considerarse implementada.

4. **Documentación:** Este documento debe mantenerse sincronizado con el código implementado.

---

**Versión:** 2.2
**Fecha:** Octubre 2025
**Autor:** Kilo Code - Arquitectura GYS
**Revisado por:** Equipo de Desarrollo GYS
**Actualización:** Regla GYS-GEN-01 actualizada de FS+0 a FS+1 - separación de 1 día laborable entre tareas hermanas para evitar superposiciones en MS Project