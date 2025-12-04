# Implementación de Vista Jerárquica para Cronograma de 6 Niveles

## 📋 Resumen Ejecutivo

Este documento detalla la implementación de una **Vista de Árbol Jerárquico** para gestionar el cronograma comercial de 6 niveles, reemplazando los modales separados actuales con una interfaz unificada que permite visualizar y gestionar toda la jerarquía en un solo lugar.

## 🎯 Objetivos

- ✅ **Simplificar gestión** de jerarquía compleja (6 niveles)
- ✅ **Proporcionar contexto visual** completo en todo momento
- ✅ **Automatizar generación** desde servicios de cotización
- ✅ **Integrar configuraciones** de fases y duraciones
- ✅ **Reducir errores** de asignación jerárquica
- ✅ **Mejorar UX** con navegación intuitiva
- ✅ **Mantener performance** con carga diferida (lazy loading)
- ✅ **Jerarquía correcta para exportación** (nivel proyecto visible en XML)

## 📊 Reglas de Generación Automática

### Sistema de Posicionamiento Flexible

#### **Opciones de Posicionamiento por Nivel**
Todos los niveles soportan dos modos de posicionamiento:

1. **"Al Inicio del Nivel Padre"**: El elemento se posiciona al inicio de su contenedor padre
2. **"Después del Último Nivel Hermano"**: El elemento se posiciona después del último elemento del mismo nivel

**Ejemplo de aplicación:**
```
Fase 1 (Padre)
├── EDT A (inicio_padre) - Primer EDT
├── EDT B (despues_ultima) - Después de EDT A
└── EDT C (despues_ultima) - Después de EDT B
```

### Emparejamientos Servicio → Cronograma

#### **Fases (Nivel 2)**
- **Fuente**: `GET /configuracion/fases`
- **Datos**: Nombres de fases + duraciones en días
- **Generación**: Automática al crear cronograma
- **Posicionamiento**: Siempre `despues_ultima` (ordenadas por configuración)
- **Ejemplo**: "Ingeniería Básica" (90 días), "Construcción" (120 días)

#### **EDT (Nivel 3)**
- **Fuente**: `CotizacionServicio.categoria`
- **Nombre EDT**: `categoria.descripcion`
- **Agrupación**: Por `categoria.nombre` (PLC, HMI, PLA, etc.)
- **Duraciones**: `GET /configuracion/duraciones-cronograma`
- **Generación**: Automática por categoría de servicio
- **Posicionamiento**: `despues_ultima` dentro de su fase asignada

#### **Zona (Nivel 4) - OPCIONAL**
- **Creación**: Manual por defecto, automática en algunos casos
- **Propósito**: Ubicación física del proyecto
- **Duraciones**: `GET /configuracion/duraciones-cronograma`
- **Posicionamiento**: Configurable por usuario
- **Ejemplo**: "Área Producción", "Sala de Control", "Piso 5"

#### **Actividad (Nivel 5) - FLEXIBLE**
- **Fuente**: `CotizacionServicio`
- **Nombre**: `CotizacionServicio.nombre`
- **Duración**: Suma de `CotizacionServicioItem.horaTotal`
- **Cálculo**: Horas → Días usando configuración de duraciones
- **Generación**: Automática por servicio
- **Posicionamiento**: **Flexible según contexto**

##### **Lógica de Ubicación de Actividades**
```
Si EDT tiene Zonas definidas:
   └── EDT
       ├── Zona 1
       │   └── Actividad (debajo de Zona)
       └── Zona 2
           └── Actividad (debajo de Zona)

Si EDT NO tiene Zonas:
   └── EDT
       ├── Actividad (directamente bajo EDT)
       └── Actividad (directamente bajo EDT)
```

**Reglas de decisión:**
1. **Si EDT tiene ≥1 zona**: Actividades van bajo zonas
2. **Si EDT no tiene zonas**: Actividades van directamente bajo EDT
3. **Creación manual**: Usuario elige ubicación (EDT o Zona específica)

#### **Tarea (Nivel 6)**
- **Fuente**: `CotizacionServicioItem`
- **Nombre**: `CotizacionServicioItem.nombre`
- **Duración**: `CotizacionServicioItem.horaTotal`
- **Cálculo**: Horas → Días usando configuración de duraciones
- **Generación**: Automática por item de servicio
- **Posicionamiento**: Siempre `despues_ultima` dentro de su actividad padre

## 🏗️ Arquitectura General

### Estructura de Componentes

```
src/components/cronograma/
├── CronogramaTreeView.tsx          # Componente principal
├── TreeNode.tsx                    # Nodo individual del árbol
├── TreeNodeActions.tsx             # Acciones contextuales
├── TreeNodeForm.tsx                # Formulario inline para edición
├── TreeNodeProgress.tsx            # Indicador de progreso
└── hooks/
    ├── useCronogramaTree.ts        # Hook principal de estado
    └── useTreeExpansion.ts         # Manejo de expansión/colapso
```

### Estructura de Datos

#### TreeNode Interface
```typescript
interface TreeNode {
  id: string
  type: 'fase' | 'edt' | 'zona' | 'actividad' | 'tarea'
  nombre: string
  parentId?: string
  children?: TreeNode[]
  level: number
  expanded?: boolean
  loading?: boolean
  data: {
    // Campos específicos por tipo
    [key: string]: any
  }
  metadata: {
    hasChildren: boolean
    totalChildren: number
    progressPercentage: number
    status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
  }
}
```

#### Estado Global del Árbol
```typescript
interface CronogramaTreeState {
  nodes: Map<string, TreeNode>
  rootNodes: string[]
  expandedNodes: Set<string>
  selectedNodeId?: string
  loadingNodes: Set<string>
  error?: string
}
```

## 📊 Paso 1: Diseño de la API Unificada

### Endpoint Principal: `/api/cotizaciones/[id]/cronograma/tree`

**Propósito**: Retornar toda la jerarquía en formato de árbol optimizado.

**Parámetros de Query**:
- `expandedNodes`: IDs de nodos expandidos (para lazy loading)
- `includeProgress`: Incluir cálculos de progreso
- `maxDepth`: Profundidad máxima a cargar

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "tree": [
      {
        "id": "fase-1",
        "type": "fase",
        "nombre": "Ingeniería Básica",
        "level": 1,
        "expanded": true,
        "hasChildren": true,
        "totalChildren": 2,
        "progressPercentage": 45,
        "status": "in_progress",
        "data": {
          "fechaInicio": "2024-01-01",
          "fechaFin": "2024-03-31",
          "diasTotales": 90
        },
        "children": [
          {
            "id": "edt-1",
            "type": "edt",
            "nombre": "Electricidad (PLC)",
            "parentId": "fase-1",
            "level": 2,
            "expanded": false,
            "hasChildren": true,
            "totalChildren": 3,
            "progressPercentage": 60,
            "status": "in_progress",
            "data": {
              "categoriaServicio": "PLC",
              "horasEstimadas": 240
            }
          }
        ]
      }
    ],
    "metadata": {
      "totalNodes": 156,
      "maxDepth": 6,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Endpoints de Configuración

#### Fases: `GET /configuracion/fases`
```json
{
  "success": true,
  "data": [
    {
      "id": "fase-1",
      "nombre": "Ingeniería Básica",
      "duracionDias": 90,
      "orden": 1
    },
    {
      "id": "fase-2",
      "nombre": "Construcción",
      "duracionDias": 120,
      "orden": 2
    }
  ]
}
```

#### Duraciones Cronograma: `GET /configuracion/duraciones-cronograma`
```json
{
  "success": true,
  "data": {
    "horasPorDia": 8,
    "diasHabiles": ["lunes", "martes", "miercoles", "jueves", "viernes"],
    "bufferPorcentaje": 10,
    "feriados": ["2024-01-01", "2024-05-01"]
  }
}
```

### Endpoints Secundarios

#### Generar Cronograma: `POST /api/cotizaciones/[id]/cronograma/generar`
```json
{
  "generarFases": true,
  "generarEdts": true,
  "generarActividades": true,
  "generarTareas": true,
  "fechaInicioProyecto": "2024-01-01"
}
```

#### Crear Nodo Manual: `POST /api/cotizaciones/[id]/cronograma/tree`
```json
{
  "type": "zona",
  "parentId": "edt-1",
  "data": {
    "nombre": "Área Producción",
    "fechaInicioComercial": "2024-01-15"
  }
}
```

#### Actualizar Nodo: `PUT /api/cotizaciones/[id]/cronograma/tree/[nodeId]`
```json
{
  "nombre": "Área Producción Actualizada",
  "fechaFinComercial": "2024-02-15"
}
```

#### Eliminar Nodo: `DELETE /api/cotizaciones/[id]/cronograma/tree/[nodeId]`

#### Recalcular Duraciones: `POST /api/cotizaciones/[id]/cronograma/recalcular`
```json
{
  "nodeIds": ["edt-1", "actividad-1"],
  "tipoRecalculo": "fechaInicio" | "duracion" | "progreso"
}
```

## 🎨 Paso 2: Diseño de la Interfaz de Usuario

### Layout Principal

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔄 Actualizar │ ⚡ Generar desde Servicios │ 📊 Vista: Árbol │ 🎯 Filtros │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─── FASE 1: Ingeniería Básica ────────────────────────────────┐ │
│ │ 📊 [45%] ┌───────────────────────────────────────────────────┐ │ │
│ │         │ 🏗️ EDT 1: Sistemas Eléctricos [60%] ▶️             │ │ │
│ │         │    📍 Zona A: Área Producción [80%] ▶️             │ │ │
│ │         │       ⚡ Cableado Principal (24h) [100%] ▶️        │ │ │
│ │         │          🔧 Preparación de canaletas [8h] [100%]  │ │ │
│ │         │          🔧 Tendido de cables [12h] [50%] ▶️      │ │ │
│ │         │             ➕ Agregar subtarea                    │ │ │
│ │         │          🔧 Conexiones y pruebas [4h] [0%]        │ │ │
│ │         │       ⚡ Iluminación Industrial (16h) [0%]         │ │ │
│ │         │    📍 Zona B: Área Administración [0%]            │ │ │
│ │         │       ⚡ +Nueva Actividad (bajo EDT directo)       │ │ │
│ │         │ 🏗️ EDT 2: Automatización Industrial [0%]          │ │ │
│ │         │    ⚡ +Nueva Actividad (bajo EDT sin zonas)        │ │ │
│ │         └───────────────────────────────────────────────────┘ │ │
│ └───────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ ⚡ Generar Completo │ 🔧 Solo Fases │ ➕ Agregar Manual │ 🗑️ Limpiar │
└─────────────────────────────────────────────────────────────────────┘
```

### Opciones de Posicionamiento en Formularios

Cuando se crea/edita un nodo, el formulario incluye:

```
Posicionamiento de Fecha Inicio:
○ Al Inicio del Padre
○ Después del Último Hermano

Ubicación para Actividades:
○ Automática (según reglas de EDT/Zona)
○ Específica (elegir EDT o Zona manualmente)
```

### Ejemplo de Generación Automática

**Cotización con Servicios:**
- Servicio 1: "Cableado Principal" (categoría: "PLC") - Items: 24 horas total
- Servicio 2: "Iluminación Industrial" (categoría: "PLC") - Items: 16 horas total
- Servicio 3: "PLC Principal" (categoría: "PLC") - Items: 40 horas total

**Resultado de Generación:**
```
📊 FASE 1: Ingeniería Básica (90 días)
├── 🏗️ EDT 1: Sistemas Eléctricos (desde categoria.descripcion)
│   ├── 📍 Zona A: Área Producción (manual/opcional)
│   │   ├── ⚡ Cableado Principal (24h → 3 días) [debajo de Zona]
│   │   │   ├── 🔧 Preparación de canaletas (8h → 1 día)
│   │   │   ├── 🔧 Tendido de cables (12h → 1.5 días)
│   │   │   └── 🔧 Conexiones y pruebas (4h → 0.5 días)
│   │   └── ⚡ Iluminación Industrial (16h → 2 días) [debajo de Zona]
│   └── 📍 Zona B: Área Administración (manual/opcional)
│       └── ⚡ +Nueva Actividad (usuario puede agregar aquí)
└── 🏗️ EDT 2: Automatización Industrial (desde categoria.descripcion)
    ├── ⚡ PLC Principal (40h → 5 días) [directamente bajo EDT - sin zonas]
    └── ⚡ +Nueva Actividad (usuario puede agregar directamente aquí)
```

### Ejemplos de Posicionamiento

#### **Posicionamiento "Al Inicio del Padre"**
```
EDT: Sistemas Eléctricos
├── ⚡ Nueva Actividad (inicio_padre) ← Se posiciona aquí
├── 📍 Zona A: Área Producción
│   └── ⚡ Cableado Principal
└── 📍 Zona B: Área Administración
```

#### **Posicionamiento "Después del Último Hermano"**
```
EDT: Sistemas Eléctricos
├── 📍 Zona A: Área Producción
│   └── ⚡ Cableado Principal
├── 📍 Zona B: Área Administración
└── ⚡ Nueva Actividad (despues_ultima) ← Se posiciona aquí
```

### Estados Visuales

#### Indicadores de Progreso
- **🟢 Verde**: Completado (100%)
- **🟡 Amarillo**: En progreso (1-99%)
- **🔴 Rojo**: Sin iniciar (0%)
- **⚫ Gris**: Pausado/Cancelado

#### Iconos por Tipo
- **📊 Fase**: Nivel estratégico
- **🏗️ EDT**: Elemento de desglose del trabajo
- **📍 Zona**: Ubicación física
- **⚡ Actividad**: Paquete de trabajo
- **🔧 Tarea**: Unidad ejecutable mínima

#### Estados de Carga
- **⏳**: Cargando hijos
- **📂**: Colapsado con hijos
- **📂⃝**: Expandido con hijos
- **📄**: Sin hijos

## 🔄 Algoritmo de Generación Automática

### Proceso de Generación desde Servicios

#### Paso 1: Obtener Datos Base
```typescript
// 1. Cargar configuración de fases
const fasesConfig = await fetch('/configuracion/fases')

// 2. Cargar configuración de duraciones
const duracionesConfig = await fetch('/configuracion/duraciones-cronograma')

// 3. Obtener servicios de la cotización
const cotizacion = await fetch(`/api/cotizaciones/${cotizacionId}`)
const servicios = cotizacion.data.servicios
```

#### Paso 2: Generar Fases (Nivel 2)
```typescript
const fasesGeneradas = fasesConfig.data.map(faseConfig => ({
  id: `fase-${faseConfig.id}`,
  type: 'fase',
  nombre: faseConfig.nombre,
  level: 2,
  data: {
    duracionDias: faseConfig.duracionDias,
    fechaInicio: fechaInicioProyecto,
    fechaFin: calcularFechaFin(fechaInicioProyecto, faseConfig.duracionDias)
  }
}))
```

#### Paso 3: Generar EDTs (Nivel 3)
```typescript
// Agrupar servicios por categoría
const serviciosPorCategoria = servicios.reduce((acc, servicio) => {
  const categoria = servicio.categoria.nombre // "PLC", "HMI", etc.
  if (!acc[categoria]) acc[categoria] = []
  acc[categoria].push(servicio)
  return acc
}, {})

// Crear EDT por cada categoría
const edtsGenerados = Object.entries(serviciosPorCategoria).map(([categoriaNombre, serviciosCategoria]) => ({
  id: `edt-${categoriaNombre}`,
  type: 'edt',
  nombre: serviciosCategoria[0].categoria.descripcion, // descripción de la categoría
  parentId: determinarFasePadre(categoriaNombre), // lógica de asignación a fase
  level: 3,
  data: {
    categoriaNombre,
    horasEstimadas: serviciosCategoria.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.horaTotal, 0), 0)
  }
}))
```

#### Paso 4: Generar Actividades (Nivel 5) - LÓGICA FLEXIBLE
```typescript
const actividadesGeneradas = servicios.map(servicio => {
  const duracionTotalHoras = servicio.items.reduce((sum, item) => sum + item.horaTotal, 0)
  const duracionDias = Math.ceil(duracionTotalHoras / duracionesConfig.horasPorDia)

  // Determinar ubicación: EDT o Zona
  const edtPadre = determinarEdtPadre(servicio.categoria.nombre)
  const edtNode = edtsGenerados.find(edt => edt.id === edtPadre)
  const zonasDelEdt = zonasGeneradas.filter(zona => zona.parentId === edtPadre)

  let parentId: string
  let posicionamiento: 'inicio_padre' | 'despues_ultima' = 'despues_ultima'

  if (zonasDelEdt.length > 0) {
    // EDT tiene zonas: actividad va bajo primera zona por defecto
    parentId = zonasDelEdt[0].id
  } else {
    // EDT sin zonas: actividad va directamente bajo EDT
    parentId = edtPadre
  }

  return {
    id: `actividad-${servicio.id}`,
    type: 'actividad',
    nombre: servicio.nombre,
    parentId,
    level: 5,
    data: {
      duracionHoras: duracionTotalHoras,
      duracionDias,
      servicioId: servicio.id,
      posicionamiento
    }
  }
})
```

#### Paso 5: Generar Tareas (Nivel 6)
```typescript
const tareasGeneradas = servicios.flatMap(servicio =>
  servicio.items.map(item => {
    const duracionDias = Math.ceil(item.horaTotal / duracionesConfig.horasPorDia)

    return {
      id: `tarea-${item.id}`,
      type: 'tarea',
      nombre: item.nombre,
      parentId: `actividad-${servicio.id}`, // Actividad padre
      level: 6,
      data: {
        horasEstimadas: item.horaTotal,
        duracionDias,
        servicioItemId: item.id
      }
    }
  })
)
```

#### Paso 6: Calcular Fechas y Dependencias
```typescript
// Asignar fechas considerando dependencias y días hábiles
const nodosConFechas = calcularFechasJerarquicas(
  [...fasesGeneradas, ...edtsGenerados, ...actividadesGeneradas, ...tareasGeneradas],
  fechaInicioProyecto,
  duracionesConfig
)
```

## ⚙️ Paso 3: Implementación Técnica

### Hook Principal: `useCronogramaTree`

```typescript
// src/components/cronograma/hooks/useCronogramaTree.ts
import { useState, useEffect, useCallback } from 'react'
import { TreeNode, CronogramaTreeState } from '../types'

export function useCronogramaTree(cotizacionId: string) {
  const [state, setState] = useState<CronogramaTreeState>({
    nodes: new Map(),
    rootNodes: [],
    expandedNodes: new Set(),
    loadingNodes: new Set()
  })

  // Cargar árbol inicial
  const loadTree = useCallback(async (expandedNodes: string[] = []) => {
    setState(prev => ({ ...prev, loadingNodes: new Set(['root']) }))

    try {
      const response = await fetch(
        `/api/cotizaciones/${cotizacionId}/cronograma/tree?expandedNodes=${expandedNodes.join(',')}`
      )

      if (!response.ok) throw new Error('Error cargando árbol')

      const data = await response.json()

      // Convertir array a Map para acceso O(1)
      const nodesMap = new Map<string, TreeNode>()
      const rootNodes: string[] = []

      const processNodes = (nodes: any[], parentId?: string) => {
        nodes.forEach(node => {
          nodesMap.set(node.id, {
            ...node,
            parentId,
            children: node.children || []
          })

          if (!parentId) {
            rootNodes.push(node.id)
          }

          if (node.children?.length > 0) {
            processNodes(node.children, node.id)
          }
        })
      }

      processNodes(data.data.tree)

      setState(prev => ({
        ...prev,
        nodes: nodesMap,
        rootNodes,
        expandedNodes: new Set(expandedNodes),
        loadingNodes: new Set()
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconocido',
        loadingNodes: new Set()
      }))
    }
  }, [cotizacionId])

  // Generar cronograma automáticamente desde servicios
  const generateFromServices = useCallback(async (options: {
    generarFases?: boolean
    generarEdts?: boolean
    generarActividades?: boolean
    generarTareas?: boolean
    fechaInicioProyecto?: string
  } = {}) => {
    setState(prev => ({ ...prev, loadingNodes: new Set(['root']) }))

    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generarFases: true,
          generarEdts: true,
          generarActividades: true,
          generarTareas: true,
          fechaInicioProyecto: new Date().toISOString().split('T')[0],
          ...options
        })
      })

      if (!response.ok) throw new Error('Error generando cronograma')

      const data = await response.json()

      // Recargar árbol con nueva estructura
      await loadTree()

      return data.data

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error generando cronograma',
        loadingNodes: new Set()
      }))
      throw error
    }
  }, [cotizacionId, loadTree])

  // Toggle expansión de nodo
  const toggleNode = useCallback(async (nodeId: string) => {
    const node = state.nodes.get(nodeId)
    if (!node) return

    const newExpanded = !state.expandedNodes.has(nodeId)

    setState(prev => ({
      ...prev,
      expandedNodes: new Set(
        newExpanded
          ? [...prev.expandedNodes, nodeId]
          : [...prev.expandedNodes].filter(id => id !== nodeId)
      )
    }))

    // Si se expande y no tiene hijos cargados, cargar hijos
    if (newExpanded && (!node.children || node.children.length === 0) && node.metadata.hasChildren) {
      await loadNodeChildren(nodeId)
    }
  }, [state.nodes, state.expandedNodes])

  // Cargar hijos de un nodo específico
  const loadNodeChildren = useCallback(async (nodeId: string) => {
    setState(prev => ({
      ...prev,
      loadingNodes: new Set([...prev.loadingNodes, nodeId])
    }))

    try {
      const response = await fetch(
        `/api/cotizaciones/${cotizacionId}/cronograma/tree/${nodeId}/children`
      )

      if (!response.ok) throw new Error('Error cargando hijos')

      const data = await response.json()

      setState(prev => {
        const newNodes = new Map(prev.nodes)
        const parentNode = newNodes.get(nodeId)

        if (parentNode) {
          parentNode.children = data.data.children
          parentNode.loading = false

          // Agregar hijos al mapa
          data.data.children.forEach((child: TreeNode) => {
            newNodes.set(child.id, { ...child, parentId: nodeId })
          })
        }

        return {
          ...prev,
          nodes: newNodes,
          loadingNodes: new Set([...prev.loadingNodes].filter(id => id !== nodeId))
        }
      })

    } catch (error) {
      setState(prev => ({
        ...prev,
        loadingNodes: new Set([...prev.loadingNodes].filter(id => id !== nodeId))
      }))
    }
  }, [cotizacionId])

  // Crear nuevo nodo
  const createNode = useCallback(async (parentId: string, type: TreeNode['type'], data: any) => {
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, type, data })
      })

      if (!response.ok) throw new Error('Error creando nodo')

      const result = await response.json()
      const newNode: TreeNode = result.data

      setState(prev => {
        const newNodes = new Map(prev.nodes)

        // Agregar nuevo nodo
        newNodes.set(newNode.id, newNode)

        // Actualizar padre
        const parent = newNodes.get(parentId)
        if (parent) {
          parent.children = [...(parent.children || []), newNode]
          parent.metadata.totalChildren++
        }

        return {
          ...prev,
          nodes: newNodes
        }
      })

      return newNode

    } catch (error) {
      throw error
    }
  }, [cotizacionId, state.nodes])

  // Actualizar nodo
  const updateNode = useCallback(async (nodeId: string, updates: Partial<TreeNode>) => {
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Error actualizando nodo')

      setState(prev => {
        const newNodes = new Map(prev.nodes)
        const existingNode = newNodes.get(nodeId)

        if (existingNode) {
          newNodes.set(nodeId, { ...existingNode, ...updates })
        }

        return { ...prev, nodes: newNodes }
      })

    } catch (error) {
      throw error
    }
  }, [cotizacionId, state.nodes])

  // Eliminar nodo
  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/tree/${nodeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error eliminando nodo')

      setState(prev => {
        const newNodes = new Map(prev.nodes)
        const nodeToDelete = newNodes.get(nodeId)

        if (nodeToDelete) {
          // Remover de hijos del padre
          const parent = nodeToDelete.parentId ? newNodes.get(nodeToDelete.parentId) : null
          if (parent && parent.children) {
            parent.children = parent.children.filter(child => child.id !== nodeId)
            parent.metadata.totalChildren--
          }

          // Remover nodo
          newNodes.delete(nodeId)
        }

        return { ...prev, nodes: newNodes }
      })

    } catch (error) {
      throw error
    }
  }, [cotizacionId, state.nodes])

  // Cargar datos iniciales
  useEffect(() => {
    loadTree()
  }, [loadTree])

  return {
    state,
    actions: {
      loadTree,
      toggleNode,
      createNode,
      updateNode,
      deleteNode,
      generateFromServices,
      selectNode: (nodeId: string) => setState(prev => ({ ...prev, selectedNodeId: nodeId }))
    }
  }
}
```

### Componente TreeNode

```typescript
// src/components/cronograma/TreeNode.tsx
import React from 'react'
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TreeNode as TreeNodeType } from './types'
import { TreeNodeProgress } from './TreeNodeProgress'

interface TreeNodeProps {
  node: TreeNodeType
  onToggle: () => void
  onAddChild: (type: TreeNodeType['type']) => void
  onEdit: () => void
  onDelete: () => void
  onSelect: () => void
  isSelected: boolean
}

const NODE_CONFIG = {
  fase: { icon: '📊', color: 'bg-blue-100 text-blue-800', canAdd: ['edt'] },
  edt: { icon: '🏗️', color: 'bg-green-100 text-green-800', canAdd: ['zona'] },
  zona: { icon: '📍', color: 'bg-yellow-100 text-yellow-800', canAdd: ['actividad'] },
  actividad: { icon: '⚡', color: 'bg-purple-100 text-purple-800', canAdd: ['tarea'] },
  tarea: { icon: '🔧', color: 'bg-gray-100 text-gray-800', canAdd: [] }
}

export function TreeNode({
  node,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
  onSelect,
  isSelected
}: TreeNodeProps) {
  const config = NODE_CONFIG[node.type]
  const hasChildren = node.metadata.hasChildren
  const isExpanded = node.expanded
  const isLoading = node.loading

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'pending': return 'bg-gray-500'
      case 'paused': return 'bg-orange-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div
      className={`tree-node ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'} border-l-2 border-transparent pl-4 py-2 cursor-pointer transition-colors`}
      style={{ paddingLeft: `${node.level * 20 + 16}px` }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {/* Toggle button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            disabled={!hasChildren && !isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>

          {/* Node icon and name */}
          <span className="text-lg">{config.icon}</span>
          <span className="font-medium text-gray-900">{node.nombre}</span>

          {/* Progress indicator */}
          <TreeNodeProgress
            percentage={node.metadata.progressPercentage}
            status={node.metadata.status}
            size="sm"
          />

          {/* Status badge */}
          <Badge variant="outline" className={config.color}>
            {node.type.toUpperCase()}
          </Badge>

          {/* Children count */}
          {hasChildren && (
            <Badge variant="secondary" className="text-xs">
              {node.metadata.totalChildren}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Add child buttons */}
          {config.canAdd.map(childType => (
            <Button
              key={childType}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(childType)
              }}
              title={`Agregar ${childType}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          ))}

          {/* More actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Additional info */}
      <div className="ml-8 mt-1 text-sm text-gray-600">
        {node.data.fechaInicioComercial && node.data.fechaFinComercial && (
          <span>
            {new Date(node.data.fechaInicioComercial).toLocaleDateString()} - {new Date(node.data.fechaFinComercial).toLocaleDateString()}
          </span>
        )}
        {node.data.horasEstimadas && (
          <span className="ml-2">({node.data.horasEstimadas}h)</span>
        )}
      </div>
    </div>
  )
}
```

### Componente Principal: CronogramaTreeView

```typescript
// src/components/cronograma/CronogramaTreeView.tsx
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TreePine, List, Filter } from 'lucide-react'
import { TreeNode } from './TreeNode'
import { TreeNodeForm } from './TreeNodeForm'
import { useCronogramaTree } from './hooks/useCronogramaTree'
import { TreeNode as TreeNodeType } from './types'

interface CronogramaTreeViewProps {
  cotizacionId: string
  onRefresh?: () => void
}

export function CronogramaTreeView({ cotizacionId, onRefresh }: CronogramaTreeViewProps) {
  const { state, actions } = useCronogramaTree(cotizacionId)
  const [showForm, setShowForm] = useState(false)
  const [formContext, setFormContext] = useState<{
    mode: 'create' | 'edit'
    nodeType?: TreeNodeType['type']
    parentId?: string
    nodeId?: string
  } | null>(null)

  const handleAddChild = (parentId: string, childType: TreeNodeType['type']) => {
    setFormContext({
      mode: 'create',
      nodeType: childType,
      parentId
    })
    setShowForm(true)
  }

  const handleEditNode = (nodeId: string) => {
    setFormContext({
      mode: 'edit',
      nodeId
    })
    setShowForm(true)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (formContext?.mode === 'create' && formContext.parentId && formContext.nodeType) {
        await actions.createNode(formContext.parentId, formContext.nodeType, data)
      } else if (formContext?.mode === 'edit' && formContext.nodeId) {
        await actions.updateNode(formContext.nodeId, data)
      }

      setShowForm(false)
      setFormContext(null)
    } catch (error) {
      console.error('Error guardando nodo:', error)
    }
  }

  const renderTree = (nodeIds: string[], level = 0): React.ReactNode => {
    return nodeIds.map(nodeId => {
      const node = state.nodes.get(nodeId)
      if (!node) return null

      const isSelected = state.selectedNodeId === nodeId
      const childNodeIds = node.children?.map(child => child.id) || []

      return (
        <React.Fragment key={nodeId}>
          <TreeNode
            node={node}
            onToggle={() => actions.toggleNode(nodeId)}
            onAddChild={(type) => handleAddChild(nodeId, type)}
            onEdit={() => handleEditNode(nodeId)}
            onDelete={() => actions.deleteNode(nodeId)}
            onSelect={() => actions.selectNode(nodeId)}
            isSelected={isSelected}
          />
          {state.expandedNodes.has(nodeId) && childNodeIds.length > 0 && (
            <div className="tree-children">
              {renderTree(childNodeIds, level + 1)}
            </div>
          )}
        </React.Fragment>
      )
    })
  }

  if (state.error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 mb-4">Error cargando cronograma</div>
          <p className="text-gray-600 text-center mb-4">{state.error}</p>
          <Button onClick={() => actions.loadTree()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-green-600" />
            <CardTitle>Cronograma Jerárquico</CardTitle>
            <Badge variant="secondary">
              {state.nodes.size} elementos
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.loadTree([...state.expandedNodes])}
              disabled={state.loadingNodes.has('root')}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${state.loadingNodes.has('root') ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="outline" size="sm">
              <List className="h-4 w-4 mr-2" />
              Vista Lista
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Toolbar de acciones globales */}
        <div className="mb-4 flex flex-wrap gap-2">
          {/* Generación automática */}
          <div className="flex gap-2 border-r pr-4 mr-4">
            <Button
              size="sm"
              variant="default"
              onClick={() => actions.generateFromServices()}
              disabled={state.loadingNodes.has('root')}
            >
              <Zap className="h-4 w-4 mr-2" />
              {state.loadingNodes.has('root') ? 'Generando...' : 'Generar desde Servicios'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Opciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => actions.generateFromServices({ generarFases: true, generarEdts: false })}>
                  Solo Fases
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.generateFromServices({ generarEdts: true, generarActividades: false })}>
                  Fases + EDTs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => actions.generateFromServices()}>
                  Completo (Fases → Tareas)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Creación manual */}
          <Button
            size="sm"
            onClick={() => handleAddChild('root', 'fase')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Fase
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddChild('root', 'edt')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar EDT Global
          </Button>
        </div>

        {/* Árbol jerárquico */}
        <div className="tree-container border rounded-lg">
          {state.rootNodes.length === 0 && !state.loadingNodes.has('root') ? (
            <div className="text-center py-12 text-gray-500">
              No hay elementos en el cronograma.
              <br />
              <Button
                className="mt-4"
                onClick={() => handleAddChild('root', 'fase')}
              >
                Crear primera fase
              </Button>
            </div>
          ) : (
            <div className="p-4">
              {renderTree(state.rootNodes)}
            </div>
          )}
        </div>

        {/* Formulario modal */}
        {showForm && formContext && (
          <TreeNodeForm
            mode={formContext.mode}
            nodeType={formContext.nodeType}
            nodeId={formContext.nodeId}
            parentId={formContext.parentId}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false)
              setFormContext(null)
            }}
            nodes={state.nodes}
          />
        )}
      </CardContent>
    </Card>
  )
}
```

## 🎨 Paso 4: Estilos CSS

```css
/* src/components/cronograma/CronogramaTreeView.css */
.tree-container {
  background: #fafafa;
  max-height: 70vh;
  overflow-y: auto;
}

.tree-node {
  border-left: 2px solid transparent;
  transition: all 0.2s ease;
}

.tree-node:hover {
  background-color: #f9f9f9;
  border-left-color: #e5e5e5;
}

.tree-node.selected {
  background-color: #eff6ff;
  border-left-color: #3b82f6;
}

.tree-children {
  border-left: 1px solid #e5e5e5;
  margin-left: 12px;
}

/* Animaciones */
.tree-node-enter {
  opacity: 0;
  transform: translateY(-10px);
}

.tree-node-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms;
}

.tree-node-exit {
  opacity: 1;
  transform: translateY(0);
}

.tree-node-exit-active {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 300ms, transform 300ms;
}

/* Responsive */
@media (max-width: 768px) {
  .tree-container {
    max-height: 50vh;
  }

  .tree-node {
    padding-left: 8px;
  }
}
```

## 🔧 Paso 5: Integración con Sistema Existente

### Reemplazo de Vistas Actuales

1. **Reemplazar `CotizacionActividadList.tsx`** con `CronogramaTreeView.tsx`
2. **Actualizar rutas** en el tab de cronograma
3. **Migrar datos existentes** si es necesario

### Archivo de Rutas Actualizado

```typescript
// src/app/comercial/cotizaciones/[id]/cronograma/page.tsx
import { CronogramaTreeView } from '@/components/cronograma/CronogramaTreeView'

export default function CronogramaPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <CronogramaTreeView cotizacionId={params.id} />
    </div>
  )
}
```

## 📈 Paso 6: Optimizaciones de Performance

### Lazy Loading
- Cargar solo nodos expandidos inicialmente
- Cargar hijos bajo demanda
- Implementar virtualización para árboles grandes (>1000 nodos)

### Caching
- Cache local de nodos expandidos
- Invalidación inteligente de cache
- Persistencia de estado de expansión en localStorage

### Debounced Updates
```typescript
// Para búsquedas y filtros
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    // Lógica de búsqueda
  }, 300),
  []
)
```

## 🧪 Paso 7: Testing

### Pruebas Unitarias
```typescript
// src/components/cronograma/__tests__/useCronogramaTree.test.ts
describe('useCronogramaTree', () => {
  it('should load tree structure correctly', async () => {
    // Test implementation
  })

  it('should handle node expansion', async () => {
    // Test implementation
  })

  it('should create nodes correctly', async () => {
    // Test implementation
  })
})
```

### Pruebas de Integración
- Crear jerarquía completa
- Verificar cálculos de progreso
- Probar operaciones CRUD
- Validar permisos de usuario

## 🚀 Paso 8: Despliegue y Migración

### Plan de Migración
1. **Desarrollo**: Implementar en rama feature
2. **Testing**: Pruebas exhaustivas con datos reales
3. **Migración de datos**: Asegurar compatibilidad
4. **Entrenamiento**: Capacitar usuarios en nueva interfaz
5. **Despliegue gradual**: Feature flag para activación controlada

### Rollback Plan
- Mantener vistas antiguas como backup
- Script de reversión de datos
- Documentación de vuelta atrás

## 📋 Checklist de Implementación

- [ ] Sistema de posicionamiento flexible implementado ("inicio_padre" vs "despues_ultima")
- [ ] Lógica de ubicación de actividades (EDT directo vs Zona) implementada
- [ ] API unificada implementada con soporte para posicionamiento
- [ ] Componentes de árbol creados con opciones de ubicación contextuales
- [ ] Estados de carga y error manejados
- [ ] Operaciones CRUD funcionales con validación de jerarquía
- [ ] UI responsive implementada con indicadores visuales de ubicación
- [ ] Testing completado incluyendo casos de ubicación flexible
- [ ] Documentación actualizada
- [ ] Migración de usuarios planificada con capacitación en posicionamiento

## 🎯 Beneficios Esperados

1. **Automatización inteligente**: Generación automática desde servicios con reglas de negocio específicas (Fases → EDTs → Actividades → Tareas)
2. **Posicionamiento flexible**: Sistema completo de "inicio_padre" vs "despues_ultima" para todos los niveles con lógica contextual
3. **Ubicación inteligente de actividades**: Actividades se colocan automáticamente bajo EDT o Zona según jerarquía existente, eliminando decisiones manuales
4. **Integración perfecta**: Con configuraciones de fases y duraciones del sistema (`/configuracion/fases`, `/configuracion/duraciones-cronograma`)
5. **Reducción de complejidad**: De 6 modales separados a 1 vista unificada con contexto visual permanente
6. **Eficiencia máxima**: Un clic genera jerarquía completa vs múltiples pasos manuales
7. **Consistencia garantizada**: Aplicación uniforme de reglas de duraciones y categorías
8. **Flexibilidad total**: Generación parcial, ubicación automática, y posicionamiento configurable por usuario
9. **Reducción de errores**: Asignaciones jerárquicas claras y validadas automáticamente con lógica de negocio integrada
10. **Mantenibilidad**: Código centralizado y reutilizable con algoritmos probados

---

**Nota**: Esta implementación requiere aproximadamente 2-3 semanas de desarrollo con un desarrollador full-stack, incluyendo testing y documentación.