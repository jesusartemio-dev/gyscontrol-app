/**
 * Crea la categoría ALQUILERES en el catálogo de equipos y carga los ítems de
 * alquiler recurrentes con código estable.
 *
 * Motivo: hoy el mismo puñado de andamios y manlifts se tipea a mano en cada
 * cotización — 52 códigos distintos para 130 ítems (AND x42, MANLIFT x15,
 * ANDAMIOS x7, TORRE, AN-1, ML, y 11 códigos TEMP-*). Sin código estable no hay
 * histórico de precio ni forma de preguntar cuánto se gasta en alquileres.
 *
 * Los precios salen de las OC realmente emitidas (no de las cotizaciones), que
 * son el precio negociado con el proveedor. El catálogo está en USD y las OC
 * en su mayoría en PEN, así que se convierten al tipo de cambio configurado en
 * ConfiguracionGeneral.
 *
 * Idempotente: salta los códigos que ya existan. Corre con --dry para ver qué
 * haría sin escribir nada.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/cargar-catalogo-alquileres.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/cargar-catalogo-alquileres.ts
 */
import { PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')

const CATEGORIA = 'ALQUILERES'
const UNIDAD = 'und'
const FACTOR_COSTO = 1
const FACTOR_VENTA = 1.15

/** moneda: 'PEN' se convierte a USD al tipo de cambio configurado; 'USD' entra tal cual. */
interface ItemAlquiler {
  codigo: string
  descripcion: string
  marca: string
  precio: number
  moneda: 'PEN' | 'USD'
  /** De dónde sale el precio — queda en el log, no en la BD. */
  fuente: string
}

const ITEMS: ItemAlquiler[] = [
  {
    codigo: 'ALQ-AND-MULTI-MOVIL',
    descripcion: 'ALQUILER ANDAMIAJE MULTIDIRECCIONAL MOVIL - EE (torre base; la altura se completa con ALQ-AND-MULTI-PIEZA)',
    marca: 'Sin marca',
    precio: 1066.26,
    moneda: 'PEN',
    fuente: 'SW ANDAMIOS GROUP — 9 OC idénticas, mar–oct 2026',
  },
  {
    codigo: 'ALQ-AND-MULTI-PIEZA',
    descripcion: 'ALQUILER PIEZA ADICIONAL DE ANDAMIAJE MULTIDIRECCIONAL (cuerpo extra sobre ALQ-AND-MULTI-MOVIL)',
    marca: 'Sin marca',
    precio: 106.27,
    moneda: 'PEN',
    fuente: 'SW ANDAMIOS GROUP — 9 OC idénticas, mar–oct 2026',
  },
  {
    codigo: 'ALQ-AND-LAYHER-MOVIL',
    descripcion: 'ALQUILER ANDAMIO NORMADO CERTIFICADO (LAYHER) - MOVIL - Ancho 1.57 m x Largo 2.07 m, Altura 4.00 m + 1.00 m de baranda de seguridad',
    marca: 'LAYHER',
    precio: 1166.14,
    moneda: 'PEN',
    fuente: 'GRUPO METALMEC — OC-260710-003, OC-260901-001',
  },
  {
    codigo: 'ALQ-AND-LAYHER-FIJO',
    descripcion: 'ALQUILER ANDAMIO NORMADO CERTIFICADO (LAYHER) - FIJO - Ancho 1.09 m x Largo 1.57 m, Altura 2.00 m + 1.00 m de baranda de seguridad',
    marca: 'LAYHER',
    precio: 529.43,
    moneda: 'PEN',
    fuente: 'GRUPO METALMEC — OC-260710-003, OC-260901-001',
  },
  {
    codigo: 'ALQ-AND-2C-GARRUCHA',
    descripcion: 'ALQUILER DE ANDAMIOS - 02 CUERPOS 2.5 x 1 m - GARRUCHA Y FIJO',
    marca: 'Sin marca',
    precio: 3407.8,
    moneda: 'PEN',
    fuente: 'METAL STYLE — OC-260525-003',
  },
  {
    codigo: 'ALQ-MANLIFT-DIA',
    descripcion: 'ALQUILER PLATAFORMA ARTICULADA (MANLIFT) - POR DÍA',
    marca: 'JLG',
    precio: 350,
    moneda: 'PEN',
    fuente: 'INGSERGEL — OC-260408-001 (PEN 350/día). INSTALL WORLD cobró PEN 300 por und en OC-260627-001',
  },
  {
    codigo: 'ALQ-MEGOHMETRO',
    descripcion: 'ALQUILER DE MEGÓHMETRO',
    marca: 'Sin marca',
    precio: 190.68,
    moneda: 'PEN',
    fuente: 'MORAY-TECH SOLUTIONS — OC-260722-001',
  },
  {
    codigo: 'ALQ-CAMIONETA-4X4-DIA',
    descripcion: 'ALQUILER CAMIONETA HILUX 4X4 PICK UP - POR DÍA',
    marca: 'TOYOTA',
    precio: 80,
    moneda: 'USD',
    fuente: 'INDUSTRIES LA FORCE — OC-261022-001 (USD 80)',
  },
]

const r2 = (v: number) => Math.round(v * 100) / 100

async function main() {
  const config = await prisma.configuracionGeneral.findUnique({ where: { id: 'default' } })
  const tipoCambio = config?.tipoCambio ?? 3.75
  console.log(`${DRY ? '[DRY RUN] ' : ''}Tipo de cambio: ${tipoCambio} PEN/USD\n`)

  // 1. Categoría
  let categoria = await prisma.categoriaEquipo.findUnique({ where: { nombre: CATEGORIA } })
  if (categoria) {
    console.log(`Categoría "${CATEGORIA}" ya existe (${categoria.id})`)
  } else if (DRY) {
    console.log(`Crearía categoría "${CATEGORIA}"`)
  } else {
    // `updatedAt` no tiene @updatedAt en CategoriaEquipo — hay que pasarlo explícito.
    categoria = await prisma.categoriaEquipo.create({
      data: {
        id: createId(),
        nombre: CATEGORIA,
        descripcion: 'Alquiler de equipos y estructuras a terceros (andamios, plataformas, instrumentos, vehículos). Se compra con OC a proveedor; no es HH ni gasto de rendición.',
        updatedAt: new Date(),
      },
    })
    console.log(`Categoría "${CATEGORIA}" creada (${categoria.id})`)
  }

  const unidad = await prisma.unidad.findFirst({ where: { nombre: UNIDAD } })
  if (!unidad) throw new Error(`No existe la unidad "${UNIDAD}"`)

  // 2. Ítems
  console.log('')
  let creados = 0
  let saltados = 0
  for (const item of ITEMS) {
    const existe = await prisma.catalogoEquipo.findUnique({ where: { codigo: item.codigo } })
    if (existe) {
      console.log(`  = ${item.codigo} ya existe, se salta`)
      saltados++
      continue
    }

    const precioLista = r2(item.moneda === 'PEN' ? item.precio / tipoCambio : item.precio)
    const precioInterno = r2(precioLista * FACTOR_COSTO)
    const precioVenta = r2(precioInterno * FACTOR_VENTA)
    const origen = item.moneda === 'PEN' ? `PEN ${item.precio} / ${tipoCambio}` : `USD ${item.precio}`

    console.log(`  ${DRY ? '~' : '+'} ${item.codigo.padEnd(24)} USD ${String(precioLista).padStart(8)} → venta ${String(precioVenta).padStart(8)}   (${origen})`)
    console.log(`      ${item.descripcion}`)
    console.log(`      fuente: ${item.fuente}`)

    if (!DRY) {
      await prisma.catalogoEquipo.create({
        data: {
          id: createId(),
          codigo: item.codigo,
          descripcion: item.descripcion,
          marca: item.marca,
          categoriaId: categoria!.id,
          unidadId: unidad.id,
          precioLista,
          precioInterno,
          precioVenta,
          factorCosto: FACTOR_COSTO,
          factorVenta: FACTOR_VENTA,
          estado: 'activo',
          updatedAt: new Date(),
        },
      })
    }
    creados++
  }

  console.log(`\n${DRY ? 'Crearía' : 'Creados'}: ${creados} ítems · saltados: ${saltados}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
