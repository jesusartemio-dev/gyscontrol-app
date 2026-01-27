# 🎯 **MODAL DE CONFIGURACIÓN PARA GENERACIÓN DE CRONOGRAMA**

## 📋 **ÍNDICE EJECUTIVO**

1. [Contexto y Problema](#contexto-y-problema)
2. [Solución Propuesta](#solución-propuesta)
3. [Arquitectura del Modal](#arquitectura-del-modal)
4. [Componentes y Funcionalidades](#componentes-y-funcionalidades)
5. [Implementación Técnica](#implementación-técnica)
6. [Beneficios y Mejoras UX](#beneficios-y-mejoras-ux)

---

## 🎯 **CONTEXTO Y PROBLEMA**

### **Problema Actual**
El botón "Generar Cronograma" ejecuta automáticamente todas las reglas sin que el usuario sepa:
- Qué reglas se están aplicando
- Qué tipo de generación se realizará
- Cómo afectará esto al cronograma existente
- Qué opciones de configuración tiene disponible

### **Impacto en UX**
- **Falta de transparencia** - Usuario no entiende qué pasa
- **Pérdida de control** - No puede elegir el tipo de generación
- **Confusión** - Resultados inesperados
- **Dificultad de aprendizaje** - No sabe qué reglas existen

---

## 💡 **SOLUCIÓN PROPUESTA**

### **Modal Interactivo de Configuración**
Un modal que permite al usuario:
1. **Seleccionar el tipo de generación** (Básica/Con Dependencias/Personalizada)
2. **Ver vista previa de reglas** que se aplicarán
3. **Configurar opciones avanzadas** según necesidad
4. **Confirmar antes de ejecutar** la generación

### **Vista de Árbol Jerárquica (Recomendado)**
```
🏢 PROYECTO (Nivel 1)
├── 📋 Fase 1: Ingeniería (Nivel 2)
│   ├── 🔧 EDT 1: Electricidad (Nivel 3)
│   │   ├── 📍 Zona A: Área Producción (Nivel 4)
│   │   │   ├── ⚡ Actividad 1: Cableado (Nivel 5)
│   │   │   │   └── 🔧 Tarea 1: Preparación (Nivel 6)
│   │   │   └── ⚡ Actividad 2: Iluminación (Nivel 5)
│   │   └── 📍 Zona B: Área Administración (Nivel 4)
│   ├── 🔧 EDT 2: Automatización (Nivel 3)
│   └── 🔧 EDT 3: Instrumentación (Nivel 3)
├── 📋 Fase 2: Construcción (Nivel 2)
└── 📋 Fase 3: Puesta en Marcha (Nivel 2)
```

**Beneficios de la Vista Jerárquica:**
- ✅ Contexto visual completo en todo momento
- ✅ Navegación intuitiva con expansión/colapso
- ✅ Generación automática desde servicios
- ✅ Reducción de modales separados (de 6 a 1 vista unificada)
- ✅ Jerarquía correcta para exportación XML (nivel proyecto visible)

### **Tres Modos de Generación (Secuenciales)**

#### **1. Básica (Obligatoria Primero)**
- ✅ **Solo reglas GYS-GEN estándar** (GYS-GEN-01 a GYS-GEN-21)
- ✅ **Secuencialidad automática** con FS+1 entre hermanos
- ✅ **Roll-up jerárquico** de horas y fechas
- ✅ **Calendario laboral dinámico**
- ✅ **Sin dependencias avanzadas**
- ✅ **Ideal para usuarios nuevos**
- ✅ **Paso obligatorio** antes de usar dependencias

#### **2. Con Dependencias (Después de Básica)**
- ✅ **TODAS las reglas GYS-GEN estándar** (igual que básica)
- ✅ **ADICIONALMENTE aplica dependencias definidas por usuario**
- ✅ **ADICIONALMENTE identifica hitos automáticamente**
- ✅ **Visualización de dependencias en Gantt** (flechas azules ← →)
- ✅ **Para usuarios intermedios**
- ✅ **Requiere cronograma básico existente**

#### **3. Personalizada (Configuración Avanzada)**
- ✅ **Configuración completa y granular**
- ✅ **Control total sobre todas las opciones**
- ✅ **Para usuarios avanzados y casos especiales**
- ✅ **Requiere cronograma básico existente**

---

## 🏗️ **ARQUITECTURA DEL MODAL**

### **Estructura de Componentes**

```
GenerarCronogramaModal/
├── Header (título y descripción)
├── Selección de Modo (3 tarjetas)
├── Vista Previa de Reglas (dinámica)
├── Configuración Avanzada (opcional)
├── Información Adicional
└── Botones de Acción
```

### **Flujo de Usuario (Secuencial)**

```
Botón "Generar Cronograma"
    ↓
Abre Modal de Configuración
    ↓
¿Ya existe cronograma básico?
├── SÍ → Mostrar opciones "Con Dependencias" y "Personalizada"
└── NO → Forzar opción "Básica" primero
    ↓
Usuario selecciona modo apropiado
    ↓
Se actualiza vista previa de reglas
    ↓
Usuario configura opciones (si modo personalizado)
    ↓
Usuario confirma y ejecuta
    ↓
Se muestra progreso y resultado
    ↓
Si fue "Básica", ahora puede usar "Con Dependencias"
```

---

## 🎨 **COMPONENTES Y FUNCIONALIDADES**

### **1. Selección de Modo**

```tsx
// Tres opciones visuales con iconos y descripciones
<Card className="cursor-pointer hover:border-blue-500">
  <CardContent className="p-4 text-center">
    <Calendar className="w-8 h-8 mx-auto mb-2" />
    <div className="font-medium">Básica</div>
    <div className="text-sm text-muted-foreground">
      Solo reglas automáticas estándar
    </div>
  </CardContent>
</Card>
```

### **2. Vista Previa de Reglas (Dinámica por Modo)**

```tsx
// Lista dinámica que cambia según selección y estado del cronograma
<Card>
  <CardHeader>
    <CardTitle className="text-lg">📋 Reglas que se aplicarán</CardTitle>
  </CardHeader>
  <CardContent>
    <ul className="space-y-2">
      {reglasAplicadas.map((regla, index) => (
        <li key={index} className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm">{regla}</span>
        </li>
      ))}
    </ul>

    {/* Información específica por modo */}
    {modo === 'basica' && (
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Después de generar el cronograma básico,
          podrás usar "Con Dependencias" para aplicar relaciones avanzadas.
        </p>
      </div>
    )}

    {modo === 'dependencias' && (
      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>Visualización:</strong> Las dependencias aparecerán como
          flechas azules (← →) en las barras del Gantt.
        </p>
      </div>
    )}
  </CardContent>
</Card>
```

### **3. Configuración Avanzada (Modo Personalizado)**

```tsx
// Opciones detalladas solo cuando se necesita
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label>Fecha de Inicio</Label>
    <Input type="date" value={opciones.fechaInicio} />
  </div>
  <div>
    <Label>Calendario Laboral</Label>
    <Select value={opciones.calendarioId}>
      {/* Opciones dinámicas */}
    </Select>
  </div>
</div>

<div className="space-y-3">
  <CheckboxWithLabel
    id="dependencias"
    checked={opciones.aplicarDependencias}
    label="Aplicar dependencias avanzadas definidas por usuario"
  />
  <CheckboxWithLabel
    id="hitos"
    checked={opciones.identificarHitos}
    label="Identificar hitos automáticamente"
  />
</div>
```

### **4. Información Educativa (Dinámica)**

```tsx
// Información contextual según modo seleccionado y estado
<Card className={`border-blue-200 ${getInfoCardStyle(modo)}`}>
  <CardContent className="pt-4">
    <h4 className="font-medium mb-2">{getInfoTitle(modo)}</h4>
    <ul className="text-sm space-y-1">
      {getInfoItems(modo, tieneCronogramaBasico).map((item, index) => (
        <li key={index}>• {item}</li>
      ))}
    </ul>

    {/* Información específica de visualización */}
    {modo === 'dependencias' && (
      <div className="mt-3 pt-3 border-t border-green-200">
        <p className="text-sm font-medium">🎨 Visualización en Gantt:</p>
        <ul className="text-sm mt-1 space-y-1">
          <li>• <strong>Flechas azules:</strong> Dependencias activas (← →)</li>
          <li>• <strong>Barras resaltadas:</strong> Tareas con dependencias</li>
          <li>• <strong>Indicadores rojos:</strong> Conflictos de dependencia</li>
        </ul>
      </div>
    )}
  </CardContent>
</Card>

// Funciones helper
function getInfoCardStyle(modo: string) {
  switch (modo) {
    case 'basica': return 'bg-blue-50'
    case 'dependencias': return 'bg-green-50'
    case 'personalizada': return 'bg-purple-50'
    default: return 'bg-gray-50'
  }
}

function getInfoTitle(modo: string) {
  switch (modo) {
    case 'basica': return '💡 Información - Cronograma Básico'
    case 'dependencias': return '🔗 Información - Con Dependencias'
    case 'personalizada': return '⚙️ Información - Configuración Avanzada'
    default: return '💡 Información'
  }
}

function getInfoItems(modo: string, tieneCronograma: boolean) {
  const items = []

  if (modo === 'basica') {
    items.push('Las reglas GYS-GEN garantizan secuencialidad automática')
    items.push('El calendario laboral respeta días no laborables')
    items.push('Es el primer paso obligatorio para usar dependencias')
  } else if (modo === 'dependencias') {
    items.push('Aplica dependencias definidas por usuario')
    items.push('Identifica automáticamente hitos críticos')
    items.push('Las dependencias se visualizan como flechas en el Gantt')
    if (!tieneCronograma) {
      items.push('⚠️ Requiere cronograma básico existente')
    }
  } else if (modo === 'personalizada') {
    items.push('Configuración completa de todas las opciones')
    items.push('Control granular sobre reglas y calendario')
    items.push('Ideal para casos especiales y usuarios avanzados')
  }

  return items
}
```

---

## 🔧 **IMPLEMENTACIÓN TÉCNICA**

### **API Endpoint Actualizado**

```typescript
// src/app/api/cotizaciones/[id]/cronograma/generar/route.ts

interface GenerarCronogramaRequest {
  modo: 'basica' | 'dependencias' | 'personalizada'
  opciones?: {
    fechaInicio?: string
    calendarioId?: string
    aplicarDependencias?: boolean
    identificarHitos?: boolean
  }
}

// POST /api/cotizaciones/[id]/cronograma/generar
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body: GenerarCronogramaRequest = await request.json()

  // Lógica según modo seleccionado
  switch (body.modo) {
    case 'basica':
      return await generarCronogramaBasico(id, body.opciones)

    case 'dependencias':
      return await generarCronogramaConDependencias(id, body.opciones)

    case 'personalizada':
      return await generarCronogramaPersonalizado(id, body.opciones)

    default:
      return NextResponse.json({ error: 'Modo de generación no válido' }, { status: 400 })
  }
}
```

### **Funciones de Generación por Modo (Secuenciales)**

```typescript
async function generarCronogramaBasico(cotizacionId: string, opciones?: any) {
  // ✅ PASO 1: Solo reglas GYS-GEN estándar (GYS-GEN-01 a GYS-GEN-21)
  // ✅ Crea estructura jerárquica con secuencialidad automática
  // ✅ Roll-up de horas y fechas
  // ✅ Calendario laboral dinámico
  // ✅ Sin dependencias avanzadas
  console.log('🚀 GENERANDO CRONOGRAMA BÁSICO - GYS-GEN-01 a GYS-GEN-21')

  return await aplicarReglasBasicas(cotizacionId, opciones)
}

async function generarCronogramaConDependencias(cotizacionId: string, opciones?: any) {
  // ✅ PASO 2: Requiere cronograma básico existente
  // ✅ TODAS las reglas GYS-GEN estándar (igual que básico)
  // ✅ ADICIONALMENTE aplica dependencias definidas por usuario
  // ✅ ADICIONALMENTE identifica hitos automáticamente
  // ✅ Visualización de dependencias en Gantt (flechas azules)

  console.log('🔗 GENERANDO CRONOGRAMA CON DEPENDENCIAS')
  console.log('📋 Aplicando reglas GYS-GEN-01 a GYS-GEN-21 (igual que básico)')

  // Verificar que existe cronograma básico
  const cronogramaExistente = await verificarCronogramaBasico(cotizacionId)
  if (!cronogramaExistente) {
    throw new Error('Debe generar cronograma básico primero')
  }

  const resultadoBasico = await aplicarReglasBasicas(cotizacionId, opciones)

  // Aplicar dependencias avanzadas (GYS-GEN-14)
  console.log('🔗 Aplicando dependencias avanzadas definidas por usuario')
  await aplicarDependenciasAFechas(cotizacionId, opciones?.calendarioLaboral)

  // Identificar hitos automáticamente
  console.log('🎯 Identificando hitos automáticamente')
  await identificarHitosAutomaticamente(cotizacionId)

  return resultadoBasico
}

async function generarCronogramaPersonalizado(cotizacionId: string, opciones: any) {
  // ✅ PASO AVANZADO: Requiere cronograma básico existente
  // ✅ Configuración completa según opciones del usuario
  // ✅ Control granular sobre todas las funcionalidades

  console.log('⚙️ GENERANDO CRONOGRAMA PERSONALIZADO')

  // Verificar que existe cronograma básico
  const cronogramaExistente = await verificarCronogramaBasico(cotizacionId)
  if (!cronogramaExistente) {
    throw new Error('Debe generar cronograma básico primero')
  }

  const resultado = await aplicarReglasBasicas(cotizacionId, opciones)

  // Aplicar opciones seleccionadas
  if (opciones.aplicarDependencias) {
    console.log('🔗 Aplicando dependencias avanzadas')
    await aplicarDependenciasAFechas(cotizacionId, opciones.calendarioLaboral)
  }

  if (opciones.identificarHitos) {
    console.log('🎯 Identificando hitos')
    await identificarHitosAutomaticamente(cotizacionId)
  }

  return resultado
}

// Función helper para verificar cronograma básico
async function verificarCronogramaBasico(cotizacionId: string): Promise<boolean> {
  const fases = await prisma.cotizacionFase.findMany({
    where: { cotizacionId },
    include: { edts: { include: { cotizacion_actividad: true } } }
  })

  return fases.length > 0 && fases.some(fase =>
    fase.edts.length > 0 && fase.edts.some(edt =>
      edt.cotizacion_actividad.length > 0
    )
  )
}
```

### **Hook de React para el Modal**

```typescript
// src/hooks/useGenerarCronograma.ts

export function useGenerarCronograma(cotizacionId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [progreso, setProgreso] = useState<string>('')

  const generar = async (configuracion: GenerarCronogramaRequest) => {
    setIsLoading(true)
    setProgreso('Iniciando generación...')

    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuracion)
      })

      if (!response.ok) {
        throw new Error('Error en la generación')
      }

      const resultado = await response.json()

      setProgreso('Generación completada exitosamente')
      return resultado

    } catch (error) {
      setProgreso('Error en la generación')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return { generar, isLoading, progreso }
}
```

---

## 🎯 **BENEFICIOS Y MEJORAS UX**

### **Beneficios para Usuarios**

#### **1. Transparencia Total**
- ✅ **Sabe qué va a pasar** - Vista previa clara de reglas
- ✅ **Control sobre el proceso** - Puede elegir el tipo de generación
- ✅ **Educación del sistema** - Aprende sobre reglas GYS-GEN
- ✅ **Confianza** - No hay sorpresas inesperadas

#### **2. Flexibilidad y Progresión**
- ✅ **Modos secuenciales** - Básico primero, luego dependencias
- ✅ **Configuración granular** - Control total cuando se necesita
- ✅ **Opciones opcionales** - Dependencias y hitos como características adicionales
- ✅ **Progresión natural** - De simple a complejo

#### **3. Mejor Experiencia y Visualización**
- ✅ **Interfaz intuitiva** - Tarjetas visuales para selección de modo
- ✅ **Feedback inmediato** - Vista previa actualizada en tiempo real
- ✅ **Información contextual** - Explicaciones específicas por modo
- ✅ **Visualización de dependencias** - Flechas azules en Gantt para dependencias activas
- ✅ **Indicadores visuales** - Estados claros del cronograma (básico vs con dependencias)

### **Beneficios Técnicos**

#### **1. Mantenibilidad**
- ✅ **Separación de concerns** - Funciones específicas por modo
- ✅ **Configuración centralizada** - Un solo lugar para opciones
- ✅ **Testing más fácil** - Cada modo se puede testear independientemente

#### **2. Escalabilidad**
- ✅ **Fácil agregar nuevos modos** - Arquitectura extensible
- ✅ **Configuración dinámica** - Nuevas opciones sin cambiar UI
- ✅ **Reutilización** - Componentes reutilizables

#### **3. Calidad**
- ✅ **Validación en frontend** - Evita errores antes de enviar
- ✅ **Feedback de progreso** - Usuario sabe qué está pasando
- ✅ **Manejo de errores** - Mensajes claros y acciones correctivas

---

## 📋 **IMPLEMENTACIÓN RECOMENDADA**

### **Fase 1: Componente Base (1-2 días)**
1. Crear `GenerarCronogramaModal.tsx`
2. Implementar selección de modos
3. Vista previa básica de reglas

### **Fase 2: Configuración Avanzada (1-2 días)**
1. Agregar opciones personalizadas
2. Validación de formulario
3. Integración con APIs existentes

### **Fase 3: Backend (2-3 días)**
1. Actualizar endpoint `/generar`
2. Implementar funciones por modo
3. Testing de integración

### **Fase 4: Testing y UX (1-2 días)**
1. Tests unitarios y E2E
2. Ajustes de UX
3. Documentación

### **Tiempo Total Estimado: 5-9 días**

---

## 🎨 **MOCKUPS Y EJEMPLOS**

### **Mockup del Modal - Modo Básico**

```
┌─────────────────────────────────────────────────┐
│ 🎯 Configurar Generación de Cronograma          │
│                                                 │
│ Selecciona cómo quieres generar el cronograma  │
│ y revisa las reglas que se aplicarán.          │
├─────────────────────────────────────────────────┤
│ 📋 Reglas que se aplicarán:                     │
│                                                 │
│ ✅ GYS-GEN-01: FS+1 entre tareas hermanas       │
│ ✅ GYS-GEN-02: Primer hijo inicia con padre     │
│ ✅ GYS-GEN-03: Roll-up jerárquico de horas      │
│ ✅ GYS-GEN-05: Calendario laboral dinámico      │
│                                                 │
│ 💡 Información:                                 │
│ • Las reglas GYS-GEN garantizan secuencialidad  │
│ • El calendario laboral respeta días no hábiles │
│ • Sin dependencias avanzadas en este modo       │
├─────────────────────────────────────────────────┤
│                    [Cancelar] [Generar]          │
└─────────────────────────────────────────────────┘
```

### **Mockup del Modal - Modo Personalizado**

```
┌─────────────────────────────────────────────────┐
│ 🎯 Configurar Generación de Cronograma          │
│                                                 │
│ Selecciona cómo quieres generar el cronograma  │
│ y revisa las reglas que se aplicarán.          │
├─────────────────────────────────────────────────┤
│ ⚙️ Configuración Avanzada:                      │
│                                                 │
│ Fecha Inicio: [2024-01-15] Calendario: [▼]      │
│                                                 │
│ ☑ Aplicar dependencias avanzadas                │
│ ☑ Identificar hitos automáticamente             │
│                                                 │
│ 📋 Reglas que se aplicarán:                     │
│ ✅ GYS-GEN-01: FS+1 entre tareas hermanas       │
│ ✅ GYS-GEN-02: Primer hijo inicia con padre     │
│ ✅ GYS-GEN-03: Roll-up jerárquico de horas      │
│ ✅ GYS-GEN-05: Calendario laboral dinámico      │
│ 🔗 Dependencias avanzadas definidas por usuario │
│ 🎯 Identificación automática de hitos           │
├─────────────────────────────────────────────────┤
│                    [Cancelar] [Generar]          │
└─────────────────────────────────────────────────┘
```

---

## ✅ **CONCLUSIÓN**

Esta mejora transforma una funcionalidad "mágica" en una experiencia controlada y educativa, donde el usuario entiende y controla exactamente qué sucede durante la generación del cronograma.

**Beneficios clave:**
- **Transparencia total** sobre reglas aplicadas
- **Control granular** del proceso de generación
- **Educación del usuario** sobre el sistema GYS
- **Flexibilidad** para diferentes niveles de usuario
- **Mejor UX** con interfaz intuitiva y feedback claro
- **Visualización de dependencias** en Gantt con flechas azules
- **Flujo secuencial** que guía al usuario naturalmente

**Implementación factible** con impacto positivo inmediato en la usabilidad del sistema.