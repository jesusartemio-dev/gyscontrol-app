# 📊 **MS PROJECT XML EXPORT GUIDE - GYS CONTROL SYSTEM**
## 📅 **Versión:** 1.1.0 | **Fecha:** 2025-10-15 | **Autor:** Kilo Code

---

## 🎯 **OBJETIVO**
Este documento establece las reglas definitivas para generar archivos XML compatibles con Microsoft Project desde el sistema GYS Control. Basado en el análisis exhaustivo de archivos nativos de MS Project y múltiples iteraciones de debugging.

**🔄 VERSIÓN 1.1.0 - EXPORTACIÓN DIRECTA:** La exportación ahora mapea directamente los datos del Gantt Profesional sin cálculos ni validaciones. Las fechas y jerarquía se preservan exactamente como se muestran en la vista Gantt.

---

## 🔍 **CONTEXTO Y PROBLEMA ORIGINAL**
El exportador inicial generaba XML que MS Project interpretaba incorrectamente:
- ❌ Duraciones mostradas en horas en lugar de días
- ❌ Fechas reprogramadas automáticamente
- ❌ Trabajo convertido a meses ("2.2 mons")
- ❌ Errores de formato no reconocidos como archivos nativos

---

## ✅ **SOLUCIÓN DEFINITIVA - FORMATO NATIVO MS PROJECT**

### **📋 Campos Globales del Proyecto (OBLIGATORIOS)**
```xml
<Project xmlns="http://schemas.microsoft.com/project">
  <!-- Identificación como archivo nativo -->
  <SaveVersion>21</SaveVersion>
  <BuildNumber>16.0.16227.20280</BuildNumber>

  <!-- Configuración de tipos de tarea -->
  <DefaultTaskType>0</DefaultTaskType>            <!-- Fixed Units -->

  <!-- Formatos de duración (CRÍTICO) -->
  <DurationFormat>21</DurationFormat>             <!-- Días (código nativo) -->

  <!-- Horarios laborales -->
  <MinutesPerDay>480</MinutesPerDay>              <!-- 8 horas/día -->
  <MinutesPerWeek>2400</MinutesPerWeek>           <!-- 40 horas/semana -->
  <DaysPerMonth>20</DaysPerMonth>                 <!-- 20 días/mes -->

  <!-- Calendario laboral -->
  <DefaultCalendarUID>1</DefaultCalendarUID>
  <DefaultCalendarName>Calendario Laboral GYS</DefaultCalendarName>
</Project>
```

---

## 🏗️ **JERARQUÍA CORRECTA PARA MS PROJECT**

### **Estructura de 6 Niveles con Raíz de Proyecto**
```
Proyecto/Cotización (Nivel 1 - Summary Task)
├── Fase 1 (Nivel 2 - Summary Task)
│   ├── EDT A (Nivel 3 - Summary Task)
│   │   ├── Zona X (Nivel 4 - Summary Task)
│   │   │   ├── Actividad 1 (Nivel 5 - Summary Task)
│   │   │   │   └── Tarea 1 (Nivel 6 - Leaf Task)
│   │   │   └── Actividad 2 (Nivel 5 - Summary Task)
│   │   └── Zona Y (Nivel 4 - Summary Task)
│   ├── EDT B (Nivel 3 - Summary Task)
│   └── EDT C (Nivel 3 - Summary Task)
├── Fase 2 (Nivel 2 - Summary Task)
└── Fase 3 (Nivel 2 - Summary Task)
```

### **Campos para Tarea Raíz del Proyecto:**
```xml
<Task>
  <UID>1</UID>
  <ID>1</ID>
  <Name>Cronograma GYS - Cotización #123</Name>
  <Type>1</Type>                             <!-- Fixed Duration -->
  <OutlineLevel>1</OutlineLevel>
  <OutlineNumber>1</OutlineNumber>
  <Summary>1</Summary>
  <DisplayAsSummary>1</DisplayAsSummary>
  <!-- NO incluir Start/Finish/Duration - MS Project calcula -->
  <TaskMode>2</TaskMode>                     <!-- Auto-scheduled -->
  <ConstraintType>2</ConstraintType>          <!-- As Soon As Possible -->
  <Manual>0</Manual>
  <PercentComplete>0</PercentComplete>
</Task>
```

---

## 🏗️ **ESTRUCTURA DE TAREAS**

### **📊 Tareas Resumen (Summary Tasks)**
```xml
<Task>
  <UID>1</UID>
  <ID>1</ID>
  <Name>Fase 1: Configuración</Name>
  <Type>1</Type>                             <!-- Fixed Duration -->
  <IsNull>0</IsNull>
  <CreateDate>2025-10-11T10:00:00</CreateDate>
  <WBS>1</WBS>
  <OutlineNumber>1</OutlineNumber>
  <OutlineLevel>1</OutlineLevel>
  <CalendarUID>1</CalendarUID>

  <!-- NO incluir Start, Finish, Duration - MS Project calcula -->
  <ResumeValid>0</ResumeValid>
  <EffortDriven>0</EffortDriven>
  <Recurring>0</Recurring>
  <OverAllocated>0</OverAllocated>
  <Estimated>0</Estimated>
  <Milestone>0</Milestone>
  <FixedCostAccrual>3</FixedCostAccrual>
  <PercentComplete>0</PercentComplete>
  <PercentWorkComplete>0</PercentWorkComplete>

  <!-- Configuración resumen -->
  <FixedDuration>1</FixedDuration>
  <Estimated>0</Estimated>
  <Units>1</Units>
  <TaskMode>2</TaskMode>                     <!-- Auto-scheduled -->
  <ConstraintType>2</ConstraintType>          <!-- As Soon As Possible -->
  <Manual>0</Manual>

  <DisplayAsSummary>1</DisplayAsSummary>
  <Summary>1</Summary>
  <Critical>0</Critical>
  <!-- ... campos estándar ... -->
</Task>
```

### **📋 Tareas Hoja (Leaf Tasks)**
```xml
<Task>
  <UID>2</UID>
  <ID>2</ID>
  <Name>Configuración de comunicación PLC-HMI-VFD</Name>
  <Type>0</Type>                             <!-- Fixed Units (CRÍTICO) -->
  <IsNull>0</IsNull>
  <CreateDate>2025-10-11T10:00:00</CreateDate>
  <WBS>1.1</WBS>
  <OutlineNumber>1.1</OutlineNumber>
  <OutlineLevel>2</OutlineLevel>
  <CalendarUID>1</CalendarUID>

  <!-- Fechas y duración MANUALES (CRÍTICO) -->
  <Start>2025-10-15T08:00:00</Start>
  <Finish>2025-11-28T17:00:00</Finish>
  <Duration>PT352H0M0S</Duration>            <!-- HORAS ISO 8601 -->

  <!-- Campos manuales para preservar fechas -->
  <ManualStart>2025-10-15T08:00:00</ManualStart>
  <ManualFinish>2025-11-28T17:00:00</ManualFinish>
  <ManualDuration>PT352H0M0S</ManualDuration>

  <!-- Configuración manual -->
  <ResumeValid>0</ResumeValid>
  <EffortDriven>0</EffortDriven>
  <Recurring>0</Recurring>
  <OverAllocated>0</OverAllocated>
  <Estimated>0</Estimated>
  <Milestone>0</Milestone>
  <FixedCostAccrual>3</FixedCostAccrual>
  <PercentComplete>0</PercentComplete>
  <PercentWorkComplete>0</PercentComplete>

  <!-- Configuración Fixed Units -->
  <FixedDuration>1</FixedDuration>
  <Estimated>0</Estimated>
  <Units>1</Units>

  <!-- Programación MANUAL (CRÍTICO) -->
  <Manual>1</Manual>
  <TaskMode>1</TaskMode>                     <!-- Manually scheduled -->
  <ConstraintType>4</ConstraintType>          <!-- Must Start On -->
  <ConstraintDate>2025-10-15T08:00:00</ConstraintDate>

  <!-- Formato de duración -->
  <DurationFormat>21</DurationFormat>         <!-- Mostrar en días -->

  <DisplayAsSummary>0</DisplayAsSummary>
  <Summary>0</Summary>
  <Critical>0</Critical>
  <!-- ... campos estándar ... -->
</Task>
```

### **🎯 Tareas Milestone**
```xml
<Task>
  <!-- ... campos estándar ... -->
  <Milestone>1</Milestone>
  <Duration>PT0H0M0S</Duration>              <!-- Duración cero -->
  <ManualDuration>PT0H0M0S</ManualDuration>
  <!-- ... resto de configuración ... -->
</Task>
```

---

## 📏 **FORMATOS DE DATOS CRÍTICOS**

### **⏰ Duración (Duration)**
```xml
<!-- ✅ CORRECTO: Horas en formato ISO 8601 -->
<Duration>PT352H0M0S</Duration>      <!-- 352 horas -->
<ManualDuration>PT352H0M0S</ManualDuration>

<!-- ❌ INCORRECTO: Días (confunde a MS Project) -->
<Duration>P44D</Duration>               <!-- NO usar -->
```

### **📅 Fechas (Start/Finish)**
```xml
<!-- ✅ CORRECTO: ISO 8601 con hora -->
<Start>2025-10-15T08:00:00</Start>
<Finish>2025-11-28T17:00:00</Finish>
<ManualStart>2025-10-15T08:00:00</ManualStart>
<ManualFinish>2025-11-28T17:00:00</ManualFinish>
```

### **🔢 Códigos de Formato (CRÍTICOS)**
```xml
<!-- Tipos de tarea -->
<Type>0</Type>                       <!-- Fixed Units (tareas hoja) -->
<Type>1</Type>                       <!-- Fixed Duration (resumen) -->
<DefaultTaskType>0</DefaultTaskType>  <!-- Fixed Units -->

<!-- Formatos de duración -->
<DurationFormat>21</DurationFormat>   <!-- Mostrar en días (nativo) -->
<!-- NO usar: 5, 3, 2, etc. -->

<!-- Modos de tarea -->
<TaskMode>1</TaskMode>                <!-- Manual (tareas hoja) -->
<TaskMode>2</TaskMode>                <!-- Auto (resumen) -->

<!-- Tipos de restricción -->
<ConstraintType>4</ConstraintType>    <!-- Must Start On (tareas hoja) -->
<ConstraintType>2</ConstraintType>    <!-- As Soon As Possible (resumen) -->
```

---

## 🚫 **PROHIBIDO - Errores Comunes**

### **❌ NO incluir campos Work**
```xml
<!-- NO usar - causa conversiones a meses -->
<Work>PT352H0M0S</Work>
<WorkFormat>2</WorkFormat>
<DefaultWorkUnits>2</DefaultWorkUnits>
```

### **❌ NO usar DurationFormat=5**
```xml
<!-- ❌ INCORRECTO -->
<DurationFormat>5</DurationFormat>

<!-- ✅ CORRECTO -->
<DurationFormat>21</DurationFormat>
```

### **❌ NO usar formato P#D para duración**
```xml
<!-- ❌ INCORRECTO - confunde a MS Project -->
<Duration>P44D</Duration>

<!-- ✅ CORRECTO -->
<Duration>PT352H0M0S</Duration>
```

### **❌ NO incluir Start/Finish en tareas resumen**
```xml
<!-- ❌ INCORRECTO para tareas resumen -->
<Task>
  <Summary>1</Summary>
  <Start>2025-10-15T08:00:00</Start>     <!-- NO -->
  <Finish>2025-11-28T17:00:00</Finish>   <!-- NO -->
  <Duration>PT352H0M0S</Duration>        <!-- NO -->
</Task>
```

---

## 🔧 **IMPLEMENTACIÓN EN CÓDIGO**

### **📁 Archivos Involucrados**
- `src/lib/utils/msProjectXmlExport.ts` - Lógica principal
- `src/components/comercial/cronograma/CronogramaGanttViewPro.tsx` - Interfaz de usuario

### **⚡ Funciones Clave**
```typescript
// Generar XML completo
export function convertToMSProjectXML(
  tasks: GanttTask[],
  projectName: string,
  calendarioLaboral?: any
): string

// Descargar archivo
export function downloadMSProjectXML(xml: string, filename: string): void
```

### **🔍 Validación Pre-Exportación**
```typescript
function validatePreExport(tasks: GanttTask[], calendarioLaboral?: any): { isValid: boolean; errors: string[] }
function validateAndCorrectTasks(tasks: MSProjectTask[], calendarioLaboral?: any): MSProjectTask[]
```

---

## 🧪 **PRUEBAS Y VALIDACIÓN**

### **✅ Checklist de Validación**
- [ ] XML se abre sin errores en MS Project
- [ ] Duraciones se muestran en días (44d, 32d, 8d)
- [ ] Fechas preservadas exactamente como exportadas
- [ ] Jerarquía correcta (fases → EDTs → actividades → tareas)
- [ ] Milestones sin duración
- [ ] Dependencias Finish-to-Start entre hermanos
- [ ] Sin campos Work que causen conversiones

### **🧪 Tareas de Prueba Específicas**
```javascript
// Verificar estas tareas específicas
const smokeTestTasks = [
  {
    name: 'Configuración de comunicación PLC-HMI-VFD',
    expected: {
      start: '2025-10-15T08:00:00',
      duration: 'PT352H0M0S',  // 352 horas = 44 días
      finish: '2025-11-28T17:00:00'
    }
  }
]
```

---

## 📚 **REFERENCIAS Y RECURSOS**

### **🔗 Documentación Oficial**
- [MS Project XML Schema](https://docs.microsoft.com/en-us/office-project/xml-data-interchange/xml-schema-reference)
- [ISO 8601 Duration Format](https://en.wikipedia.org/wiki/ISO_8601#Durations)

### **📋 Códigos de MS Project**
| Campo | Valor | Descripción |
|-------|-------|-------------|
| `DurationFormat` | `21` | Mostrar duración en días |
| `DefaultTaskType` | `0` | Fixed Units |
| `TaskMode` | `1` | Manual (tareas hoja) |
| `TaskMode` | `2` | Auto (tareas resumen) |
| `ConstraintType` | `4` | Must Start On |
| `Type` | `0` | Fixed Units |
| `Type` | `1` | Fixed Duration |

---

## 🚨 **REGLAS DE ORO**

1. **✅ EXPORTACIÓN DIRECTA** - Mapear datos del Gantt sin cálculos ni validaciones
2. **✅ FECHAS EXACTAS** - Usar `task.fechaInicio` y `task.fechaFin` tal cual
3. **✅ DURACIÓN POR HORAS** - Calcular duración solo de `task.horasEstimadas`
4. **✅ JERARQUÍA PRESERVADA** - Mantener estructura exacta del Gantt
5. **✅ SIEMPRE usar `DurationFormat=21`** (no 5, 3, etc.)
6. **✅ SIEMPRE usar `Type=0`** para tareas hoja (Fixed Units)
7. **✅ SIEMPRE usar duración en formato `PT#H0M0S`** (horas ISO)
8. **✅ SIEMPRE incluir campos Manual para tareas hoja**
9. **✅ NUNCA incluir campos Work**
10. **✅ NUNCA incluir Start/Finish en tareas resumen**
11. **✅ SIEMPRE incluir SaveVersion y BuildNumber**

---

## 📞 **SOPORTE Y MANTENIMIENTO**

### **👥 Responsables**
- **Desarrollo:** Kilo Code
- **Testing:** Equipo QA GYS
- **Documentación:** Equipo Técnico

### **🔄 Actualizaciones**
- **Versión:** 1.1.0
- **Última actualización:** 2025-10-15
- **Próxima revisión:** 2026-04-11

### **📋 Checklist de Cambios**
- [x] Implementar formato nativo MS Project
- [x] Agregar SaveVersion y BuildNumber
- [x] Cambiar DurationFormat a 21
- [x] Cambiar Type a 0 (Fixed Units)
- [x] Implementar campos Manual
- [x] Remover campos Work
- [x] Cambiar duración a PT#H0M0S
- [x] Agregar jerarquía completa con nivel raíz del proyecto
- [x] **EXPORTACIÓN DIRECTA** - Sin cálculos ni validaciones
- [x] **FECHAS EXACTAS** - Mapeo directo de datos del Gantt
- [x] **DURACIÓN POR HORAS** - Solo de `task.horasEstimadas`
- [x] **JERARQUÍA PRESERVADA** - Estructura exacta del Gantt
- [x] Crear esta documentación

---

**🎯 RECUERDA:** Este documento evita que repitamos el proceso de debugging de 2+ semanas. Seguir estas reglas garantiza compatibilidad perfecta con MS Project.