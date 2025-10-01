// Temporary in-memory storage for plantillas (until Prisma is regenerated)

export interface PlantillaExclusion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  activo: boolean
  orden: number
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    descripcion: string
    orden: number
    activo: boolean
  }>
  _count: { items: number }
}

export interface PlantillaCondicion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  tipo?: string
  activo: boolean
  orden: number
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    descripcion: string
    tipo: string
    orden: number
    activo: boolean
  }>
  _count: { items: number }
}

import fs from 'fs'
import path from 'path'

const STORAGE_FILE = path.join(process.cwd(), 'temp-plantillas-storage.json')

// Initialize storage
let plantillasExclusiones: PlantillaExclusion[] = []
let plantillasCondiciones: PlantillaCondicion[] = []

try {
  if (fs.existsSync(STORAGE_FILE)) {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8')
    const parsed = JSON.parse(data)
    plantillasExclusiones = parsed.exclusiones || []
    plantillasCondiciones = parsed.condiciones || []
  } else {
    // Initial data
    plantillasExclusiones = [
      {
        id: 'plantilla-exclusiones-general',
        nombre: 'Exclusiones Generales',
        descripcion: 'Exclusiones estándar para proyectos industriales',
        categoria: 'general',
        activo: true,
        orden: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'item-1',
            descripcion: 'Suministro de licencias para el correcto funcionamiento del sistema',
            orden: 1,
            activo: true
          },
          {
            id: 'item-2',
            descripcion: 'Calibración de instrumentos',
            orden: 2,
            activo: true
          },
          {
            id: 'item-3',
            descripcion: 'Planos o diagramas eléctricos/mecánicos completos del sistema',
            orden: 3,
            activo: true
          }
        ],
        _count: { items: 3 }
      }
    ]

    plantillasCondiciones = [
      {
        id: 'plantilla-condiciones-general',
        nombre: 'Condiciones Generales',
        descripcion: 'Condiciones estándar para proyectos industriales',
        categoria: 'general',
        tipo: 'comercial',
        activo: true,
        orden: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'cond-1',
            descripcion: 'Los precios son válidos según el alcance técnico ofertado y plazos estipulados. Cualquier modificación requerida por el cliente será objeto de actualización de oferta.',
            tipo: 'comercial',
            orden: 1,
            activo: true
          },
          {
            id: 'cond-2',
            descripcion: 'El cliente debe enviar su orden de compra a ventas@gyscontrol.com. Si no recibe confirmación, debe comunicarse con GYS.',
            tipo: 'comercial',
            orden: 2,
            activo: true
          },
          {
            id: 'cond-3',
            descripcion: 'El plazo de entrega inicia una vez aclarado técnica-comercialmente el pedido.',
            tipo: 'entrega',
            orden: 3,
            activo: true
          }
        ],
        _count: { items: 3 }
      },
      {
        id: 'plantilla-condiciones-precios',
        nombre: 'Condiciones de Precios y Pagos',
        descripcion: 'Condiciones específicas para precios y formas de pago',
        categoria: 'precios',
        tipo: 'comercial',
        activo: true,
        orden: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'precio-1',
            descripcion: 'Los precios ofertados NO incluyen IGV.',
            tipo: 'comercial',
            orden: 1,
            activo: true
          },
          {
            id: 'precio-2',
            descripcion: 'No se aceptará anulación total o parcial de órdenes de compra, salvo casos sustentados. Penalidades pueden alcanzar hasta el 100% del valor de la orden.',
            tipo: 'comercial',
            orden: 2,
            activo: true
          }
        ],
        _count: { items: 2 }
      }
    ]

    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ exclusiones: plantillasExclusiones, condiciones: plantillasCondiciones }, null, 2))
  }
} catch (error) {
  console.error('Error loading plantillas storage:', error)
  // Fallback to initial data
  plantillasExclusiones = [
    {
      id: 'plantilla-exclusiones-general',
      nombre: 'Exclusiones Generales',
      descripcion: 'Exclusiones estándar para proyectos industriales',
      categoria: 'general',
      activo: true,
      orden: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'item-1',
          descripcion: 'Suministro de licencias para el correcto funcionamiento del sistema',
          orden: 1,
          activo: true
        },
        {
          id: 'item-2',
          descripcion: 'Calibración de instrumentos',
          orden: 2,
          activo: true
        },
        {
          id: 'item-3',
          descripcion: 'Planos o diagramas eléctricos/mecánicos completos del sistema',
          orden: 3,
          activo: true
        }
      ],
      _count: { items: 3 }
    }
  ]

  plantillasCondiciones = [
    {
      id: 'plantilla-condiciones-general',
      nombre: 'Condiciones Generales',
      descripcion: 'Condiciones estándar para proyectos industriales',
      categoria: 'general',
      tipo: 'comercial',
      activo: true,
      orden: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'cond-1',
          descripcion: 'Los precios son válidos según el alcance técnico ofertado y plazos estipulados. Cualquier modificación requerida por el cliente será objeto de actualización de oferta.',
          tipo: 'comercial',
          orden: 1,
          activo: true
        },
        {
          id: 'cond-2',
          descripcion: 'El cliente debe enviar su orden de compra a ventas@gyscontrol.com. Si no recibe confirmación, debe comunicarse con GYS.',
          tipo: 'comercial',
          orden: 2,
          activo: true
        },
        {
          id: 'cond-3',
          descripcion: 'El plazo de entrega inicia una vez aclarado técnica-comercialmente el pedido.',
          tipo: 'entrega',
          orden: 3,
          activo: true
        }
      ],
      _count: { items: 3 }
    },
    {
      id: 'plantilla-condiciones-precios',
      nombre: 'Condiciones de Precios y Pagos',
      descripcion: 'Condiciones específicas para precios y formas de pago',
      categoria: 'precios',
      tipo: 'comercial',
      activo: true,
      orden: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: 'precio-1',
          descripcion: 'Los precios ofertados NO incluyen IGV.',
          tipo: 'comercial',
          orden: 1,
          activo: true
        },
        {
          id: 'precio-2',
          descripcion: 'No se aceptará anulación total o parcial de órdenes de compra, salvo casos sustentados. Penalidades pueden alcanzar hasta el 100% del valor de la orden.',
          tipo: 'comercial',
          orden: 2,
          activo: true
        }
      ],
      _count: { items: 2 }
    }
  ]
}

// Function to save data
export function savePlantillasExclusiones() {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ exclusiones: plantillasExclusiones, condiciones: plantillasCondiciones }, null, 2))
  } catch (error) {
    console.error('Error saving plantillas storage:', error)
  }
}

export { plantillasExclusiones, plantillasCondiciones }
