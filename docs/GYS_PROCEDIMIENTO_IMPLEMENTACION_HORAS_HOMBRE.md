# 📋 **PROCEDIMIENTO COMPLETO: IMPLEMENTACIÓN DEL SISTEMA DE HORAS HOMBRE Y GESTIÓN DE TAREAS**

## 🎯 **Objetivos del Procedimiento**

Implementar un **sistema completo de gestión de tareas y timesheets** inspirado en Odoo pero adaptado específicamente a nuestro **sistema de cronogramas de 5 niveles**, con:

1. **Tres tipos de cronogramas** (Comercial, Planificación, Ejecución)
2. **Asignación de responsables** en Fases, EDTs, Actividades y Tareas
3. **Registro flexible de horas** (cualquier usuario puede registrar en cualquier nivel)
4. **Accesos directos** desde sidebar para timesheets y tareas personales
5. **Integración completa** con jerarquía de 5 niveles

---

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **Tres Tipos de Cronogramas**

```
🏢 PROYECTO
├── 💰 Cronograma COMERCIAL (Cómo se cotizó)
│   └── Fases → EDTs → Actividades → Tareas (con precios)
│
├── 📋 Cronograma PLANIFICACIÓN (Línea Base)
│   └── Fases → EDTs → Actividades → Tareas (fechas planificadas)
│
└── ⚙️ Cronograma EJECUCIÓN (Real ejecutado)
    ├── Fases → EDTs → Actividades → Tareas (fechas reales)
    └── ⏱️ TIMESHEETS (Horas hombre registradas)
```

### **Dos Niveles de Acceso**

```
🌐 Sidebar Principal (Accesos Directos)
├── ⏱️ Horas Hombre → Timesheets personales
└── ✅ Mis Tareas → Gestión personal

🏗️ Dentro de Proyecto (Vista Integrada)
└── 📋 Cronograma → Tareas → Gestión integrada
```

---

## 📁 **FASE 1: CONFIGURACIÓN DEL SIDEBAR**

### **Paso 1.1: Agregar Accesos Directos al Sidebar**

**Archivo:** `src/components/Sidebar.tsx`

```typescript
// Sección HORAS HOMBRE (para registro y gestión personal)
{
  key: 'horas-hombre',
  title: 'Horas Hombre',
  icon: Clock,
  color: 'text-emerald-400',
  roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'colaborador'],
  links: [
    { href: '/horas-hombre/timesheet', label: 'Mi Timesheet', icon: Calendar },
    { href: '/horas-hombre/registro', label: 'Registrar Horas', icon: Clock },
    { href: '/horas-hombre/historial', label: 'Historial', icon: History },
  ]
}

// Sección MIS TAREAS (para gestión personal de tareas)
{
  key: 'mis-tareas',
  title: 'Mis Tareas',
  icon: CheckSquare,
  color: 'text-blue-400',
  roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'colaborador'],
  links: [
    { href: '/tareas/asignadas', label: 'Tareas Asignadas', icon: UserCheck },
    { href: '/tareas/progreso', label: 'Mi Progreso', icon: TrendingUp },
    { href: '/tareas/equipo', label: 'Equipo', icon: Users },
  ]
}
```

### **Paso 1.2: Agregar Tab "Tareas" al Cronograma**

**Archivo:** `src/components/proyectos/cronograma/ProyectoCronogramaTab.tsx`

```typescript
// Agregar nuevo tab en TabsList
<TabsTrigger value="tareas" className="flex items-center gap-2">
  <CheckSquare className="h-4 w-4" />
  Tareas
</TabsTrigger>

// Nuevo TabsContent
<TabsContent value="tareas" className="space-y-4">
  <ProyectoTareasView
    proyectoId={proyectoId}
    cronogramaId={selectedCronograma?.id}
    onHorasRegistradas={handleRefresh}
  />
</TabsContent>
```

---

## 🏗️ **FASE 2: COMPONENTES PRINCIPALES**

### **Paso 2.1: Crear Componente `ProyectoTareasView.tsx`**

**Ubicación:** `src/components/proyectos/cronograma/ProyectoTareasView.tsx`

```typescript
interface ProyectoTareasViewProps {
  proyectoId: string;
  cronogramaId?: string;
  onHorasRegistradas: () => void;
}

export function ProyectoTareasView({
  proyectoId,
  cronogramaId,
  onHorasRegistradas
}: ProyectoTareasViewProps) {
  // Vista jerárquica Fases → EDTs → Actividades → Tareas
  // Con asignación de responsables y registro de horas
}
```

### **Paso 2.2: Crear Componente `TimesheetSemanal.tsx`**

**Ubicación:** `src/components/horas-hombre/TimesheetSemanal.tsx`

```typescript
interface TimesheetSemanalProps {
  semana: Date;
  onHorasRegistradas: () => void;
}

export function TimesheetSemanal({ semana, onHorasRegistradas }: TimesheetSemanalProps) {
  // Vista semanal de timesheet como Odoo
  // Calendario interactivo con drag & drop
}
```

### **Paso 2.3: Crear Componente `RegistroHorasForm.tsx`**

**Ubicación:** `src/components/horas-hombre/RegistroHorasForm.tsx`

```typescript
interface RegistroHorasFormProps {
  onSuccess: () => void;
  tareaPreseleccionada?: {
    id: string;
    nombre: string;
    nivel: 'tarea' | 'actividad' | 'fase' | 'edt';
  };
}

export function RegistroHorasForm({ onSuccess, tareaPreseleccionada }: RegistroHorasFormProps) {
  // Formulario inteligente de registro de horas
  // Con jerarquía Fase → EDT → Actividad → Tarea
}
```

---

## 🔌 **FASE 3: APIs DEL SISTEMA**

### **Paso 3.1: API para Jerarquía de Tareas**

**Archivo:** `src/app/api/proyectos/[id]/cronograma/tareas-jerarquia/route.ts`

```typescript
// GET /api/proyectos/[id]/cronograma/tareas-jerarquia
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Retorna jerarquía completa Fases → EDTs → Actividades → Tareas
  // Con responsables asignados y horas registradas
}
```

### **Paso 3.2: API para Asignar Responsables**

**Archivo:** `src/app/api/proyectos/cronograma/asignar-responsable/route.ts`

```typescript
// PUT /api/proyectos/cronograma/asignar-responsable
export async function PUT(request: NextRequest) {
  const { tipo, id, responsableId } = await request.json();

  // Asigna responsable a Fase, EDT, Actividad o Tarea
  // Actualiza permisos y notificaciones
}
```

### **Paso 3.3: API para Registro de Horas**

**Archivo:** `src/app/api/horas-hombre/registrar/route.ts`

```typescript
// POST /api/horas-hombre/registrar
export async function POST(request: NextRequest) {
  const {
    nivel, // 'tarea' | 'actividad' | 'fase' | 'edt'
    id,    // ID del elemento
    fecha,
    horas,
    descripcion
  } = await request.json();

  // Registra horas en el nivel especificado
  // Actualiza progreso automáticamente
  // Propaga cambios a niveles superiores
}
```

### **Paso 3.4: API para Timesheet Semanal**

**Archivo:** `src/app/api/horas-hombre/timesheet-semanal/route.ts`

```typescript
// GET /api/horas-hombre/timesheet-semanal?semana=2025-W03
export async function GET(request: NextRequest) {
  // Retorna timesheet semanal del usuario
  // Con entradas por día y totales
}
```

---

## 🎨 **FASE 4: INTERFAZ DE USUARIO**

### **Paso 4.1: Página "/horas-hombre/timesheet"**

**Vista semanal interactiva:**
```
🗓️ MI TIMESHEET - Semana 13-19 Enero 2025

📊 Resumen Semana:
• Total Horas: 32h
• Días trabajados: 5/7
• Promedio diario: 6.4h
• Vs semana anterior: +8%

📅 Calendario Semanal:
LUN 13 | MAR 14 | MIÉ 15 | JUE 16 | VIE 17 | SÁB 18 | DOM 19
8.0h   | 7.5h   | 6.0h  | 8.0h  | 2.5h  | 0.0h   | 0.0h

🔧 Proyectos donde trabajé:
• Proyecto ABC: 20h (Centro de Datos)
• Proyecto XYZ: 12h (Oficinas Corporativas)
```

### **Paso 4.2: Página "/tareas/asignadas"**

**Dashboard personal de tareas:**
```
✅ MIS TAREAS ASIGNADAS

📊 Resumen:
• Tareas activas: 12
• Completadas esta semana: 5
• Próximas fechas límite: 3

🎯 Tareas por Prioridad:
🔴 Alta: 3 tareas
🟡 Media: 7 tareas
🟢 Baja: 2 tareas

📋 Lista de Tareas:
• 🔴 Tarea 1.1.1 - Preparación cableado (Proyecto ABC)
  📅 Vence: 2025-01-20 | ⏱️ 8h estimadas | 📊 75% completada

• 🟡 Actividad 2.3 - Instalación eléctrica (Proyecto XYZ)
  📅 Vence: 2025-01-25 | ⏱️ 24h estimadas | 📊 45% completada
```

### **Paso 4.3: Tab "Tareas" en Cronograma**

**Vista jerárquica integrada:**
```
🏗️ PROYECTO: Centro de Datos ABC

📋 Cronograma Ejecución (Activo)

📂 Fase 1: Infraestructura [120h plan, 95h real, 79%]
👤 Responsable: Juan Pérez | ⏱️ Estado: En Progreso

  ├── 📁 EDT 1: Servicio Eléctrico [45h plan, 38h real, 84%]
  👤 Responsable: María García | ⏱️ Estado: En Progreso

    ├── ⚙️ Actividad 1.1: Cableado Principal [25h plan, 22h real, 88%]
    👤 Responsable: Carlos López | ⏱️ Estado: Completada

      ├── ✅ Tarea 1.1.1: Preparación [8h plan, 12h real, 150%]
      👤 Responsable: Carlos López | ⏱️ Estado: Completada
      ⏱️ Horas: Juan(6h), María(4h), Carlos(2h)

      └── ✅ Tarea 1.1.2: Instalación [12h plan, 10h real, 83%]
      👤 Responsable: Ana Rodríguez | ⏱️ Estado: En Progreso
      ⏱️ Horas: Ana(8h), Carlos(2h)
```

---

## 🔄 **FASE 5: LÓGICA DE NEGOCIO**

### **Paso 5.1: Jerarquía Inteligente de Registro**

```typescript
function determinarNivelRegistro(
  tareaId?: string,
  actividadId?: string,
  faseId?: string,
  edtId?: string
) {
  // Prioridad: Tarea > Actividad > Fase > EDT
  if (tareaId) return { nivel: 'tarea', id: tareaId };
  if (actividadId) return { nivel: 'actividad', id: actividadId };
  if (faseId) return { nivel: 'fase', id: faseId };
  if (edtId) return { nivel: 'edt', id: edtId };

  throw new Error('Se requiere al menos un EDT para registrar horas');
}
```

### **Paso 5.2: Cálculo Automático de Progreso**

```typescript
function calcularProgresoReal(elementoId: string, nivel: string) {
  const horasPlanificadas = getHorasPlanificadas(elementoId, nivel);
  const horasRegistradas = getHorasRegistradas(elementoId, nivel);

  // Progreso = (horas reales / horas planificadas) * 100
  const progreso = Math.min(100, (horasRegistradas / horasPlanificadas) * 100);

  // Actualizar elemento y propagar hacia arriba
  actualizarProgresoElemento(elementoId, nivel, progreso);
  propagarProgresoHaciaArriba(elementoId, nivel);
}
```

### **Paso 5.3: Modelo de Asignación de Responsables**

```typescript
// Extensión del schema Prisma
model ProyectoEdt {
  // ... campos existentes
  responsableId String? // ✅ Nuevo: Usuario responsable del EDT
  responsable   User?   @relation("EdtResponsable", fields: [responsableId], references: [id])
}

model ProyectoFase {
  // ... campos existentes
  responsableId String? // ✅ Nuevo: Usuario responsable de la fase
  responsable   User?   @relation("FaseResponsable", fields: [responsableId], references: [id])
}

model ProyectoActividad {
  // ... campos existentes
  responsableId String? // ✅ Nuevo: Usuario responsable de la actividad
  responsable   User?   @relation("ActividadResponsable", fields: [responsableId], references: [id])
}

model ProyectoTarea {
  // ... campos existentes
  responsableId String? // ✅ Nuevo: Usuario responsable de la tarea
  responsable   User?   @relation("TareaResponsable", fields: [responsableId], references: [id])
}
```

---

## 📊 **FASE 6: REPORTES Y ANALYTICS**

### **Paso 6.1: Dashboard de Productividad**

**Archivo:** `src/components/horas-hombre/DashboardProductividad.tsx`

```typescript
export function DashboardProductividad({ userId }: { userId: string }) {
  // Métricas de productividad personal
  // - Horas por semana/mes
  // - Eficiencia por proyecto
  // - Comparativas con objetivos
  // - Tendencias de productividad
}
```

### **Paso 6.2: Reportes de Equipo**

**Archivo:** `src/components/tareas/ReportesEquipo.tsx`

```typescript
export function ReportesEquipo({ managerId }: { managerId: string }) {
  // Reportes para gestores/coordinadores
  // - Horas por miembro del equipo
  // - Productividad del equipo
  // - Comparativas entre miembros
  // - Alertas de bajo rendimiento
}
```

---

## 🧪 **FASE 7: TESTING Y VALIDACIÓN**

### **Paso 7.1: Tests de Jerarquía**

```typescript
describe('Jerarquía de Registro de Horas', () => {
  test('debe registrar en tarea cuando está disponible', () => {
    const resultado = determinarNivelRegistro('tarea-123');
    expect(resultado).toEqual({ nivel: 'tarea', id: 'tarea-123' });
  });

  test('debe hacer fallback a actividad cuando no hay tarea', () => {
    const resultado = determinarNivelRegistro(undefined, 'actividad-456');
    expect(resultado).toEqual({ nivel: 'actividad', id: 'actividad-456' });
  });
});
```

### **Paso 7.2: Tests de Cálculo de Progreso**

```typescript
describe('Cálculo Automático de Progreso', () => {
  test('debe calcular progreso basado en horas', () => {
    const progreso = calcularProgresoReal(10, 8); // 8h reales de 10h planificadas
    expect(progreso).toBe(80);
  });

  test('no debe exceder 100%', () => {
    const progreso = calcularProgresoReal(10, 15); // 15h reales de 10h planificadas
    expect(progreso).toBe(100);
  });
});
```

---

## 🚀 **FASE 8: DESPLIEGUE Y FORMACIÓN**

### **Paso 8.1: Migración de Datos**

```typescript
// Script de migración para asignar responsables por defecto
// Basado en usuarios que han registrado horas históricamente
export async function migrarAsignacionResponsables() {
  // 1. Identificar usuarios que han trabajado en cada elemento
  // 2. Asignar como responsables a quienes más han trabajado
  // 3. Mantener consistencia con permisos existentes
}
```

### **Paso 8.2: Capacitación por Roles**

#### **Para Personal Operativo:**
- Cómo registrar horas diariamente
- Cómo usar el timesheet semanal
- Cómo ver tareas asignadas

#### **Para Gestores/Coordinadores:**
- Cómo asignar responsables
- Cómo monitorear progreso del equipo
- Cómo revisar reportes de productividad

#### **Para Administradores:**
- Cómo configurar permisos
- Cómo ver reportes globales
- Cómo gestionar excepciones

---

## 📋 **CHECKLIST DE IMPLEMENTACIÓN**

### **Funcionalidades Core:**
- ✅ **Accesos directos** desde sidebar (Horas Hombre, Mis Tareas)
- ✅ **Tab "Tareas"** integrado en cronograma
- ✅ **Asignación de responsables** Fases → EDTs → Actividades → Tareas
- ✅ **Registro flexible** de horas (cualquier usuario en cualquier nivel)
- ✅ **Timesheet semanal** como Odoo
- ✅ **Jerarquía inteligente** de registro
- ✅ **Cálculo automático** de progreso
- ✅ **Reportes y analytics** personal y de equipo

### **Integración:**
- ✅ **Tres tipos de cronograma** (Comercial/Planificación/Ejecución)
- ✅ **Jerarquía de 5 niveles** completa
- ✅ **Sincronización automática** entre sistemas
- ✅ **Permisos por rol** apropiados

### **UX/UI:**
- ✅ **Vista semanal** de timesheet
- ✅ **Dashboard personal** de tareas
- ✅ **Vista jerárquica** en cronograma
- ✅ **Feedback visual** de estados y progreso
- ✅ **Responsive** para todos los dispositivos

---

## 🎯 **FLUJO DE USUARIO COMPLETO**

### **Usuario Operativo (Ingeniero/Colaborador):**
1. **Accede** a "Mi Timesheet" desde sidebar
2. **Registra horas** semanalmente con vista calendario
3. **Ve tareas asignadas** en "Mis Tareas"
4. **Registra horas** directamente desde cronograma si está trabajando

### **Gestor/Coordinador:**
1. **Asigna responsables** en el tab "Tareas" del cronograma
2. **Monitorea progreso** del equipo en tiempo real
3. **Revisa reportes** de productividad
4. **Ajusta asignaciones** según rendimiento

### **Administrador:**
1. **Configura permisos** de acceso
2. **Revisa métricas globales** de productividad
3. **Gestiona excepciones** y casos especiales

---

## 📈 **MÉTRICAS DE ÉXITO**

- **Adopción:** 90% del personal operativo registra horas semanalmente
- **Precisión:** 98% de registros válidos (sin errores de jerarquía)
- **Actualización:** Progreso del cronograma actualizado en tiempo real
- **Satisfacción:** 95% de usuarios reportan mejora en visibilidad del trabajo
- **Eficiencia:** 30% reducción en tiempo de reporte manual

---

## 🎯 **PRÓXIMOS PASOS RECOMENDADOS**

1. **Fase 1:** Configurar sidebar y crear páginas base
2. **Fase 2:** Implementar componentes principales (ProyectoTareasView, TimesheetSemanal)
3. **Fase 3:** Desarrollar APIs de jerarquía y registro
4. **Fase 4:** Crear interfaces de usuario
5. **Fase 5:** Implementar lógica de negocio y cálculos
6. **Fase 6:** Desarrollar reportes y analytics
7. **Fase 7:** Testing exhaustivo
8. **Fase 8:** Despliegue y capacitación

**¿Listo para comenzar la implementación de este sistema inspirado en Odoo?**