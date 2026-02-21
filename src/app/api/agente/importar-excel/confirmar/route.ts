// src/app/api/agente/importar-excel/confirmar/route.ts
// Paso 2: Recibe datos confirmados + mapeos, crea todo en BD con transacción Prisma

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createId } from '@paralleldrive/cuid2'
import { generateNextCotizacionCode } from '@/lib/utils/cotizacionCodeGenerator'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import type {
  ExcelEquipoGrupo,
  ExcelServicioGrupo,
  ExcelGastoGrupo,
} from '@/lib/agente/excelExtractor'

export const maxDuration = 60

// ── Request types ─────────────────────────────────────────

interface RecursoMapping {
  excelName: string
  recursoId: string
}

interface EdtMapping {
  excelEdtName: string
  edtId: string
}

interface CondicionInput {
  texto: string
  tipo?: string
}

interface ExclusionInput {
  texto: string
}

interface ConfirmarRequest {
  // Datos extraídos (posiblemente editados por el usuario)
  equipos: ExcelEquipoGrupo[]
  servicios: ExcelServicioGrupo[]
  gastos: ExcelGastoGrupo[]

  // Mapeos confirmados
  recursoMappings: RecursoMapping[]
  edtMappings: EdtMapping[]

  // Configuración
  clienteId: string
  comercialId?: string
  nombreCotizacion: string
  moneda?: string
  notas?: string

  // Per-item catalog selections: keys like "0-0", "0-2", "1-1" (grupoIdx-itemIdx)
  catalogItems: string[]

  // Datos del PDF (opcionales)
  condiciones?: CondicionInput[]
  exclusiones?: ExclusionInput[]
  formaPago?: string
  validezOferta?: number
}

// ── Helpers ───────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

const now = () => new Date()

// ── Handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: ConfirmarRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const {
    equipos,
    servicios,
    gastos,
    recursoMappings,
    edtMappings,
    clienteId,
    nombreCotizacion,
    moneda = 'USD',
    notas,
    catalogItems = [],
    condiciones,
    exclusiones,
    formaPago,
    validezOferta,
  } = body

  // Validaciones básicas
  if (!clienteId) {
    return NextResponse.json({ error: 'Se requiere clienteId' }, { status: 400 })
  }
  if (!nombreCotizacion) {
    return NextResponse.json(
      { error: 'Se requiere nombreCotizacion' },
      { status: 400 }
    )
  }

  const comercialId = body.comercialId || (session.user as { id: string }).id

  // Build lookup sets/maps
  const recursoMap = new Map<string, string>()
  for (const rm of recursoMappings) {
    recursoMap.set(rm.excelName, rm.recursoId)
  }

  const edtMap = new Map<string, string>()
  for (const em of edtMappings) {
    edtMap.set(em.excelEdtName, em.edtId)
  }

  // Set of keys like "0-0", "1-3" indicating which items should go to catalog
  const catalogItemSet = new Set(catalogItems)

  try {
    // Generar código de cotización
    const { codigo, numeroSecuencia } = await generateNextCotizacionCode()
    const cotizacionId = genId('cot')

    // Obtener unidad por defecto para equipos
    let defaultUnidadId: string | null = null
    const unidadUnd = await prisma.unidad.findFirst({ where: { nombre: 'Und' } })
    defaultUnidadId = unidadUnd?.id || null

    // Obtener unidad de servicio por defecto
    let defaultUnidadServicioId: string | null = null
    const unidadHora = await prisma.unidadServicio.findFirst({
      where: { nombre: { contains: 'Hora', mode: 'insensitive' } },
    })
    defaultUnidadServicioId = unidadHora?.id || null

    if (!defaultUnidadServicioId) {
      const anyUnidadServicio = await prisma.unidadServicio.findFirst()
      defaultUnidadServicioId = anyUnidadServicio?.id || null
    }

    // ── Transacción principal ────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create CatalogoEquipo ONLY for items marked by the user
      const catalogoEquipoMap = new Map<string, string>() // "grupoIdx-itemIdx" → catalogoEquipoId

      for (let gi = 0; gi < equipos.length; gi++) {
        const grupo = equipos[gi]
        for (let ii = 0; ii < grupo.items.length; ii++) {
          const key = `${gi}-${ii}`
          if (!catalogItemSet.has(key)) continue // Skip — item stays only in cotización

          const item = grupo.items[ii]

          // Check if already exists by code
          if (item.codigo) {
            const existing = await tx.catalogoEquipo.findFirst({
              where: { codigo: item.codigo },
            })
            if (existing) {
              catalogoEquipoMap.set(key, existing.id)
              continue
            }
          }

          // Check if already exists by exact description
          const existingByDesc = await tx.catalogoEquipo.findFirst({
            where: { descripcion: { equals: item.descripcion, mode: 'insensitive' } },
          })
          if (existingByDesc) {
            catalogoEquipoMap.set(key, existingByDesc.id)
            continue
          }

          // Find category
          let categoriaId: string | null = null
          if (item.categoria) {
            const cat = await tx.categoriaEquipo.findFirst({
              where: { nombre: { contains: item.categoria, mode: 'insensitive' } },
            })
            categoriaId = cat?.id || null
          }
          if (!categoriaId) {
            const defaultCat = await tx.categoriaEquipo.findFirst()
            categoriaId = defaultCat?.id || null
          }
          if (!categoriaId) continue // Skip if no category available

          // Find unit
          let unidadId = defaultUnidadId
          if (item.unidad) {
            const u = await tx.unidad.findFirst({
              where: { nombre: { equals: item.unidad, mode: 'insensitive' } },
            })
            if (u) unidadId = u.id
          }
          if (!unidadId) continue

          const newId = createId()
          await tx.catalogoEquipo.create({
            data: {
              id: newId,
              codigo: item.codigo || `IMP-${createId().substring(0, 8).toUpperCase()}`,
              descripcion: item.descripcion,
              marca: item.marca || 'Sin marca',
              precioLista: item.precioLista,
              precioInterno: item.precioInterno,
              factorCosto: item.factorCosto,
              factorVenta: item.factorVenta,
              precioVenta: item.precioCliente,
              categoriaId,
              unidadId,
              estado: 'pendiente',
            },
          })
          catalogoEquipoMap.set(key, newId)
        }
      }

      // 2. Crear Cotización
      await tx.cotizacion.create({
        data: {
          id: cotizacionId,
          codigo,
          numeroSecuencia,
          nombre: nombreCotizacion,
          clienteId,
          comercialId,
          estado: 'borrador',
          moneda,
          notas: notas || null,
          formaPago: formaPago || null,
          validezOferta: validezOferta || 15,
          fecha: now(),
          updatedAt: now(),
          totalEquiposInterno: 0,
          totalEquiposCliente: 0,
          totalServiciosInterno: 0,
          totalServiciosCliente: 0,
          totalGastosInterno: 0,
          totalGastosCliente: 0,
          totalInterno: 0,
          totalCliente: 0,
          grandTotal: 0,
        },
      })

      // 3. Crear grupos de equipos + items
      let equipoItemCount = 0
      for (let gi = 0; gi < equipos.length; gi++) {
        const grupo = equipos[gi]
        const grupoId = genId('cot-eq')
        await tx.cotizacionEquipo.create({
          data: {
            id: grupoId,
            cotizacionId,
            nombre: grupo.grupo,
            subtotalInterno: 0,
            subtotalCliente: 0,
            updatedAt: now(),
          },
        })

        for (let ii = 0; ii < grupo.items.length; ii++) {
          const item = grupo.items[ii]
          const key = `${gi}-${ii}`
          const costoInterno = item.precioInterno * item.cantidad
          const costoCliente = item.precioCliente * item.cantidad

          await tx.cotizacionEquipoItem.create({
            data: {
              id: genId('cot-eqi'),
              cotizacionEquipoId: grupoId,
              catalogoEquipoId: catalogoEquipoMap.get(key) || null,
              codigo: item.codigo || `IMP-${(++equipoItemCount).toString().padStart(3, '0')}`,
              descripcion: item.descripcion,
              categoria: item.categoria || 'General',
              unidad: item.unidad || 'Und',
              marca: item.marca || '',
              precioLista: item.precioLista,
              precioInterno: item.precioInterno,
              factorCosto: item.factorCosto,
              factorVenta: item.factorVenta,
              precioCliente: item.precioCliente,
              cantidad: item.cantidad,
              costoInterno,
              costoCliente,
              updatedAt: now(),
            },
          })
        }
      }

      // 4. Crear grupos de servicios + items
      for (const grupo of servicios) {
        const edtId = edtMap.get(grupo.edtSugerido || grupo.grupo)
        if (!edtId) continue // Skip grupos sin EDT mapeado

        const grupoId = genId('cot-sv')
        await tx.cotizacionServicio.create({
          data: {
            id: grupoId,
            cotizacionId,
            nombre: grupo.grupo,
            edtId,
            subtotalInterno: 0,
            subtotalCliente: 0,
            updatedAt: now(),
          },
        })

        for (const act of grupo.actividades) {
          // Cada actividad puede tener múltiples recursos → creamos un item por recurso
          for (const rec of act.recursos) {
            const recursoId = recursoMap.get(rec.recursoNombre)
            if (!recursoId) continue // Skip recursos no mapeados

            if (!defaultUnidadServicioId) continue

            const costoCliente = rec.horas * rec.costoHora * (grupo.factorSeguridad || 1.0)
            const margen = grupo.margen || 1.35
            const costoInterno = margen > 0 ? costoCliente / margen : costoCliente

            await tx.cotizacionServicioItem.create({
              data: {
                id: genId('cot-svi'),
                cotizacionServicioId: grupoId,
                nombre: act.nombre,
                descripcion: act.descripcion || act.nombre,
                edtId,
                recursoId,
                recursoNombre: rec.recursoNombre,
                unidadServicioId: defaultUnidadServicioId,
                unidadServicioNombre: 'Hora',
                formula: 'Fijo',
                horaFijo: rec.horas,
                horaBase: rec.horas,
                horaRepetido: 0,
                costoHora: rec.costoHora,
                cantidad: 1,
                horaTotal: rec.horas,
                factorSeguridad: grupo.factorSeguridad || 1.0,
                margen,
                costoInterno: +costoInterno.toFixed(2),
                costoCliente: +costoCliente.toFixed(2),
                updatedAt: now(),
              },
            })
          }
        }
      }

      // 5. Crear grupos de gastos + items
      for (const grupo of gastos) {
        const grupoId = genId('cot-gs')
        await tx.cotizacionGasto.create({
          data: {
            id: grupoId,
            cotizacionId,
            nombre: grupo.grupo,
            subtotalInterno: 0,
            subtotalCliente: 0,
            updatedAt: now(),
          },
        })

        for (const item of grupo.items) {
          await tx.cotizacionGastoItem.create({
            data: {
              id: genId('cot-gsi'),
              gastoId: grupoId,
              nombre: item.nombre,
              descripcion: item.descripcion || null,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              factorSeguridad: 1.0,
              margen: 1.0,
              costoInterno: item.costoInterno,
              costoCliente: item.costoCliente,
              updatedAt: now(),
            },
          })
        }
      }

      // 6. Crear condiciones (del PDF)
      if (condiciones && condiciones.length > 0) {
        for (let i = 0; i < condiciones.length; i++) {
          await tx.cotizacionCondicion.create({
            data: {
              id: genId('cot-cond'),
              cotizacionId,
              descripcion: condiciones[i].texto,
              tipo: condiciones[i].tipo || null,
              orden: i,
              updatedAt: now(),
            },
          })
        }
      }

      // 7. Crear exclusiones (del PDF)
      if (exclusiones && exclusiones.length > 0) {
        for (let i = 0; i < exclusiones.length; i++) {
          await tx.cotizacionExclusion.create({
            data: {
              id: genId('cot-excl'),
              cotizacionId,
              descripcion: exclusiones[i].texto,
              orden: i,
              updatedAt: now(),
            },
          })
        }
      }

      return { cotizacionId, codigo }
    })

    // 8. Recalcular totales fuera de la transacción
    await recalcularTotalesCotizacion(result.cotizacionId)

    return NextResponse.json({
      ok: true,
      cotizacionId: result.cotizacionId,
      codigo: result.codigo,
    })
  } catch (error) {
    console.error('Error confirmar-importacion:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: `Error creando cotización: ${message}`,
        ...(process.env.NODE_ENV === 'development' && error instanceof Error
          ? { stack: error.stack }
          : {}),
      },
      { status: 500 }
    )
  }
}
