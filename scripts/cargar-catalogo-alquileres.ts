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
    descripcion: 'ALQUILER ANDAMIAJE MULTIDIRECCIONAL MOVIL - EE - torre Ancho 1.57 m x Largo 2.07 m (con 1 pieza adicional llega a 4.50 m + 1.00 m de baranda) - POR 30 DIAS CALENDARIO',
    marca: 'Sin marca',
    precio: 1066.26,
    moneda: 'PEN',
    fuente: 'SW ANDAMIOS GROUP — 9 OC idénticas, mar–oct 2026. Período 30 días calendario (OC-260427-001, OC-260921-001)',
  },
  {
    codigo: 'ALQ-AND-MULTI-PIEZA',
    descripcion: 'ALQUILER PIEZA ADICIONAL DE ANDAMIAJE MULTIDIRECCIONAL - VS3-SW vertical sin espiga 1.50 m, se suma a ALQ-AND-MULTI-MOVIL - POR 30 DIAS CALENDARIO',
    marca: 'Sin marca',
    precio: 106.27,
    moneda: 'PEN',
    fuente: 'SW ANDAMIOS GROUP — 9 OC idénticas, mar–oct 2026. Período 30 días calendario (OC-260427-001, OC-260921-001)',
  },
  // Un cuerpo LAYHER = 2.00 m de altura. Se confirma con la cotización
  // ALQUILER2026-1780: "2.5 cuerpos" = altura 5.00 m, "2 cuerpos" = 4.00 m.
  // El código lleva tipo (M/F) + cuerpos + planta porque las tres cosas
  // cambian el precio y el proveedor cotiza cada combinación por separado.
  {
    codigo: 'ALQ-AND-LAYHER-M-2C-157X207',
    descripcion: 'ALQUILER ANDAMIO NORMADO CERTIFICADO (LAYHER) - MOVIL - 2 cuerpos - Ancho 1.57 m x Largo 2.07 m, Altura 4.00 m + 1.00 m de baranda de seguridad - POR 30 DIAS CALENDARIO',
    marca: 'LAYHER',
    precio: 1166.14,
    moneda: 'PEN',
    fuente: 'GRUPO METALMEC S.A.C. RUC 20613341511 — OC-260710-003, OC-260901-001 (renovación 13/08 al 12/09, 30 días)',
  },
  {
    codigo: 'ALQ-AND-LAYHER-F-1C-109X157',
    descripcion: 'ALQUILER ANDAMIO NORMADO CERTIFICADO (LAYHER) - FIJO - 1 cuerpo - Ancho 1.09 m x Largo 1.57 m, Altura 2.00 m + 1.00 m de baranda de seguridad - POR 30 DIAS CALENDARIO',
    marca: 'LAYHER',
    precio: 529.43,
    moneda: 'PEN',
    fuente: 'GRUPO METALMEC S.A.C. RUC 20613341511 — OC-260710-003, OC-260901-001 (renovación 13/08 al 12/09, 30 días)',
  },
  {
    codigo: 'ALQ-AND-LAYHER-M-2.5C-207X207',
    descripcion: 'ALQUILER ANDAMIO NORMADO CERTIFICADO (LAYHER) - MOVIL - 2.5 cuerpos - Ancho 2.07 m x Largo 2.07 m, Altura 5.00 m + 1.00 m de baranda de seguridad - POR 30 DIAS CALENDARIO',
    marca: 'LAYHER',
    precio: 1618.17,
    moneda: 'PEN',
    fuente: 'Cotización ALQUILER2026-1780, ítem 1 — GRUPO METALMEC, 30 días calendario, precio sin IGV',
  },
  {
    codigo: 'ALQ-AND-LAYHER-F-2C-207X207',
    descripcion: 'ALQUILER ANDAMIO NORMADO CERTIFICADO (LAYHER) - FIJO - 2 cuerpos - Ancho 2.07 m x Largo 2.07 m, Altura 4.00 m + 1.00 m de baranda de seguridad - POR 30 DIAS CALENDARIO',
    marca: 'LAYHER',
    precio: 1116.36,
    moneda: 'PEN',
    fuente: 'Cotización ALQUILER2026-1780, ítem 2 — GRUPO METALMEC, 30 días calendario, precio sin IGV',
  },
  {
    codigo: 'ALQ-AND-LAYHER-KIT-PIEZAS',
    descripcion: 'ALQUILER PIEZAS DE ANDAMIO NORMADO CERTIFICADO (LAYHER) - kit: 4 grapa fija SW 22 + 3 ringscaff horizontal 1.09 m galvanizada + 1 escalera para horizontal - POR 30 DIAS CALENDARIO',
    marca: 'LAYHER',
    precio: 47.42,
    moneda: 'PEN',
    fuente: 'Cotización ALQUILER2026-1780, ítem 3 — GRUPO METALMEC, 30 días calendario, precio sin IGV',
  },
  {
    codigo: 'ALQ-AND-2C-GARRUCHA',
    descripcion: 'ALQUILER DE ANDAMIOS - 02 CUERPOS 2.5 x 1 m - 1 con garrucha + 1 fijo - INCLUYE MONTAJE Y DESMONTAJE CON ANDAMIERO (5 dias de ejecucion), EPPs y herramientas del proveedor',
    marca: 'Sin marca',
    precio: 3407.8,
    moneda: 'PEN',
    fuente: 'METAL STYLE — OC-260525-003. Ojo: no es alquiler puro, incluye montaje con andamiero',
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
    descripcion: 'ALQUILER DE MEGOHMETRO - POR 03 DIAS',
    marca: 'Sin marca',
    precio: 190.68,
    moneda: 'PEN',
    fuente: 'MORAY-TECH SOLUTIONS — OC-260722-001 (alquiler 22/07 al 24/07, 3 días)',
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

/**
 * Códigos de la primera carga que se renombran al esquema tipo+cuerpos+planta.
 * Hizo falta cuando entró una segunda configuración LAYHER (2.07 x 2.07) y
 * "MOVIL" / "FIJO" a secas dejaron de identificar nada.
 */
const RENOMBRAR: Record<string, string> = {
  'ALQ-AND-LAYHER-MOVIL': 'ALQ-AND-LAYHER-M-2C-157X207',
  'ALQ-AND-LAYHER-FIJO': 'ALQ-AND-LAYHER-F-1C-109X157',
}

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

  // 1b. Renombres pendientes del esquema viejo
  for (const [viejo, nuevo] of Object.entries(RENOMBRAR)) {
    const actual = await prisma.catalogoEquipo.findUnique({
      where: { codigo: viejo },
      select: { id: true, _count: { select: { cotizacionEquipoItem: true, proyectoEquipoCotizadoItem: true, listaEquipoItem: true } } },
    })
    if (!actual) continue
    const usos = actual._count.cotizacionEquipoItem + actual._count.proyectoEquipoCotizadoItem + actual._count.listaEquipoItem
    if (usos > 0) {
      console.log(`  ! ${viejo} tiene ${usos} usos — no se renombra, revisar a mano`)
      continue
    }
    if (DRY) {
      console.log(`  ~ renombraría ${viejo} → ${nuevo}`)
    } else {
      await prisma.catalogoEquipo.update({ where: { id: actual.id }, data: { codigo: nuevo, updatedAt: new Date() } })
      console.log(`  → ${viejo} renombrado a ${nuevo}`)
    }
  }

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
