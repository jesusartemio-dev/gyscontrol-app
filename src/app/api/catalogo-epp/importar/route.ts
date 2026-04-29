import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SUBCATEGORIAS_VALIDAS = ['cabeza', 'manos', 'ojos', 'auditiva', 'respiratoria', 'pies', 'caida', 'ropa', 'visibilidad', 'otro']
const TALLA_CAMPOS_VALIDOS = ['calzado', 'camisa', 'pantalon', 'casco']

interface ItemEntrada {
  codigo: string
  descripcion: string
  marca?: string | null
  modelo?: string | null
  talla?: string | null
  subcategoria: string
  unidad: string // nombre — se resuelve a unidadId aquí
  requiereTalla?: boolean
  tallaCampo?: string | null
  vidaUtilDias?: number | null
  esConsumible?: boolean
  precioReferencial?: number | null
  monedaReferencial?: string
}

interface ResultadoFila {
  fila?: number
  codigo: string
  estado: 'creado' | 'actualizado' | 'error'
  error?: string
}

/**
 * POST /api/catalogo-epp/importar
 * Recibe { items: ItemEntrada[] } y hace upsert por código.
 * Resuelve unidad por nombre (case-insensitive).
 * Retorna desglose de creados/actualizados/errores.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const items: Array<ItemEntrada & { fila?: number }> = body.items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay items para importar' }, { status: 400 })
    }

    // Cargar unidades existentes para resolver por nombre
    const unidades = await prisma.unidad.findMany({ select: { id: true, nombre: true } })
    const unidadMap = new Map(unidades.map(u => [u.nombre.toLowerCase().trim(), u.id]))

    const resultados: ResultadoFila[] = []
    let creados = 0
    let actualizados = 0
    let conError = 0

    for (const item of items) {
      const fila = item.fila
      const codigo = (item.codigo ?? '').trim()
      try {
        // Validaciones básicas
        if (!codigo) throw new Error('Código vacío')
        if (!item.descripcion?.trim()) throw new Error('Descripción vacía')
        if (!SUBCATEGORIAS_VALIDAS.includes(item.subcategoria)) {
          throw new Error(`Subcategoría inválida: "${item.subcategoria}"`)
        }
        const unidadId = unidadMap.get((item.unidad ?? '').toLowerCase().trim())
        if (!unidadId) throw new Error(`Unidad no encontrada: "${item.unidad}"`)

        if (item.requiereTalla && !item.tallaCampo) {
          throw new Error('Requiere talla pero no especifica el Tipo de talla')
        }
        if (item.tallaCampo && !TALLA_CAMPOS_VALIDOS.includes(item.tallaCampo)) {
          throw new Error(`Tipo de talla inválido: "${item.tallaCampo}"`)
        }
        if (item.requiereTalla && !item.talla?.toString().trim()) {
          throw new Error('Requiere talla pero no se indicó el valor de la talla (ej. M, 40)')
        }

        const moneda = (item.monedaReferencial ?? 'PEN').toUpperCase()
        if (!['PEN', 'USD'].includes(moneda)) throw new Error(`Moneda inválida: "${moneda}"`)

        const dataBase = {
          descripcion: item.descripcion.trim(),
          marca: item.marca?.trim() || null,
          modelo: item.modelo?.trim() || null,
          talla: item.requiereTalla ? (item.talla?.toString().trim() || null) : null,
          unidadId,
          subcategoria: item.subcategoria as any,
          requiereTalla: !!item.requiereTalla,
          tallaCampo: item.requiereTalla ? (item.tallaCampo as any) : null,
          vidaUtilDias: item.vidaUtilDias != null ? Number(item.vidaUtilDias) : null,
          esConsumible: !!item.esConsumible,
          precioReferencial: item.precioReferencial != null ? Number(item.precioReferencial) : null,
          monedaReferencial: moneda,
        }

        // Upsert
        const existente = await prisma.catalogoEPP.findUnique({ where: { codigo } })
        if (existente) {
          await prisma.catalogoEPP.update({
            where: { codigo },
            data: dataBase,
          })
          actualizados++
          resultados.push({ fila, codigo, estado: 'actualizado' })
        } else {
          await prisma.catalogoEPP.create({
            data: { codigo, ...dataBase, activo: true },
          })
          creados++
          resultados.push({ fila, codigo, estado: 'creado' })
        }
      } catch (e: any) {
        conError++
        resultados.push({ fila, codigo: codigo || '(sin código)', estado: 'error', error: e?.message ?? String(e) })
      }
    }

    return NextResponse.json({
      total: items.length,
      creados,
      actualizados,
      conError,
      resultados,
    })
  } catch (error: any) {
    console.error('Error en importar catálogo EPP:', error)
    return NextResponse.json({ error: error?.message || 'Error en importación' }, { status: 500 })
  }
}
