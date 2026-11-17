/**
 * Carga la lista de los 3 tableros de comunicación de CJM52.
 *
 * El cotizado trae 7 ítems para UN tablero, más un grupo aparte "OTROS 2
 * TABLEROS" que es un bulto cerrado sin desglose. La lista va por los tres,
 * así que las cantidades son el total y los ítems que existen en el cotizado
 * lo reemplazan.
 *
 * Decisiones tomadas con el usuario:
 *  - Los tres ítems que suministra NEXA (ETAP Stratix, SFP, plug RJ45) no
 *    entran: la lista es lo que GYS compra.
 *  - Los nueve materiales que el cotizado agrupa como "MV — MATERIALES
 *    VARIOS" (1 glb) entran uno por uno, como desglose de ese global, para
 *    poder pedirlos y recibirlos por separado.
 *  - El SOPORTE INOX y la FABRICACIÓN cotizados quedan fuera de la lista.
 *
 * Es idempotente: un ítem ya cargado se reconoce por su código y no se
 * duplica.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/cargar-lista-tableros-comunicacion-cjm52.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/cargar-lista-tableros-comunicacion-cjm52.ts
 */
import { prisma } from '../src/lib/prisma'
import { createId } from '@paralleldrive/cuid2'

const DRY = process.argv.includes('--dry')

const LISTA_CODIGO = 'CJM52-LST-001'
const GRUPO_COTIZADO = '392992ef-14b2-473b-9586-6424379ecba9'

/** Ítems del cotizado a los que apuntan los de la lista. */
const COTIZADO = {
  armario: '961ca794-d541-4cd7-bc21-4c285381add2',   // AX 1446000
  fuente: 'bb364af3-f979-461b-b496-cd2674aadb0f',    // 1606-XLE80E
  patchcord: '9d6f773c-bd7d-408e-a994-0c24beb4a862', // FZ2ELLNLNSNM005
  llave: '0f62ac66-0ab7-486f-9382-697bc7d12bbf',     // A9F74204
  varios: 'af15c127-a742-4b59-b93a-4b0014236a8f',    // MV
}

interface ItemBom {
  codigo: string
  descripcion: string
  marca: string
  /** Para los tres tableros. */
  cantidad: number
  unidad: string
  categoria: string
  /**
   * El ítem del cotizado que ESTE ítem cubre. No es un reemplazo: es el mismo
   * equipo, con el código bien escrito ("AX 1446.000" contra "AX 1446000").
   */
  cotizadoId?: string
  /** De qué global del cotizado es un desglose. */
  desgloseDe?: string
}

const CATEGORIA = {
  tableros: 'TABLEROS',
  accesorios: 'ACCESORIOS',
  protecciones: 'PROTECCIONES',
  comunicacion: 'COMUNICACIÓN',
  soporteria: 'SOPORTERÍA',
}

const BOM: ItemBom[] = [
  {
    codigo: 'AX 1446.000',
    descripcion: 'Armario poliéster AX sin ventana 400x600x200 mm (placa de montaje 305x525 mm)',
    marca: 'RITTAL', cantidad: 3, unidad: 'und', categoria: CATEGORIA.tableros,
    cotizadoId: COTIZADO.armario,
  },
  {
    codigo: 'AX 1485.200',
    descripcion: 'Ángulo universal para armario AX de poliéster — pack de 4; se usan 2 por tablero (6 und en total)',
    marca: 'RITTAL', cantidad: 2, unidad: 'und', categoria: CATEGORIA.accesorios,
  },
  {
    codigo: '1485.300',
    descripcion: 'Tornillos de montaje interior para armario AX (pack)',
    marca: 'RITTAL', cantidad: 1, unidad: 'und', categoria: CATEGORIA.accesorios,
  },
  {
    codigo: 'CHASIS-GALV-AX-400X600',
    descripcion: 'Chasis de acero galvanizado entre ángulos, con borne PE — fabricación GYS',
    marca: 'GYS', cantidad: 3, unidad: 'und', categoria: CATEGORIA.soporteria,
  },
  {
    codigo: 'A9F74204',
    descripcion: 'Interruptor Acti9 iC60N 2P 4A curva C',
    marca: 'SCHNEIDER', cantidad: 3, unidad: 'und', categoria: CATEGORIA.protecciones,
    cotizadoId: COTIZADO.llave,
  },
  {
    codigo: '1606-XLE80E',
    descripcion: 'Fuente de poder 24-28 VDC 80 W, entrada 120/240 VAC',
    marca: 'ALLEN-BRADLEY', cantidad: 3, unidad: 'und', categoria: CATEGORIA.tableros,
    cotizadoId: COTIZADO.fuente,
  },
  {
    codigo: 'DIO BW12',
    descripcion: 'ODF DIO BW12: 12 LC dúplex, 24 pigtails LC OM4 UPC, 12 adaptadores y tapas ciegas',
    marca: 'FURUKAWA', cantidad: 3, unidad: 'und', categoria: CATEGORIA.comunicacion,
  },
  {
    codigo: '35150250',
    descripcion: 'Base para riel DIN del ODF DIO BW12',
    marca: 'FURUKAWA', cantidad: 3, unidad: 'und', categoria: CATEGORIA.comunicacion,
  },
  {
    codigo: 'FZ2ELLNLNSNM0.5',
    descripcion: 'Patch cord FO OM4 2F 1.6 mm LSZH LC dúplex / LC dúplex 0.5 m',
    marca: 'PANDUIT', cantidad: 3, unidad: 'und', categoria: CATEGORIA.comunicacion,
    cotizadoId: COTIZADO.patchcord,
  },

  // ── Los nueve que el cotizado agrupa en "MV — MATERIALES VARIOS" ────────
  {
    codigo: 'TB1-BORNERA-JGO',
    descripcion: 'Bornera TB1 (juego): 3 bornes de 6 mm² (L, N, PE) + 3 bornes de 2.5 mm² (+24V, 0V, reserva), tapa y 2 topes',
    marca: 'SIN-MARCA', cantidad: 3, unidad: 'und', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'BARRA-PE-8P',
    descripcion: 'Barra de tierra PE de aproximadamente 8 puntos',
    marca: 'SIN-MARCA', cantidad: 3, unidad: 'und', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'CANALETA-25X40',
    descripcion: 'Canaleta ranurada 25x40 mm',
    marca: 'SIN-MARCA', cantidad: 1.41, unidad: 'm', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'RIEL-DIN-35X7.5',
    descripcion: 'Riel DIN 35x7.5 mm de acero galvanizado',
    marca: 'SIN-MARCA', cantidad: 0.66, unidad: 'm', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'PRENSAESTOPA-M25',
    descripcion: 'Prensaestopas M25 para cable RZ1-K 3x6 mm²',
    marca: 'SIN-MARCA', cantidad: 3, unidad: 'und', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'PRENSAESTOPA-M16',
    descripcion: 'Prensaestopas M16 para fibra óptica armada y UTP',
    marca: 'SIN-MARCA', cantidad: 6, unidad: 'und', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'KIT-PAT-ARMADURA-FO',
    descripcion: 'Kit de puesta a tierra para armadura de fibra óptica (CST)',
    marca: 'SIN-MARCA', cantidad: 3, unidad: 'und', categoria: CATEGORIA.comunicacion,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'BASE-CINTILLO',
    descripcion: 'Base porta-cintillo con cintillo',
    marca: 'SIN-MARCA', cantidad: 30, unidad: 'und', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
  {
    codigo: 'PLACA-ACRILICA-ID',
    descripcion: 'Placa acrílica de identificación para puerta de tablero (texto por confirmar)',
    marca: 'SIN-MARCA', cantidad: 3, unidad: 'und', categoria: CATEGORIA.accesorios,
    desgloseDe: COTIZADO.varios,
  },
]

async function main() {
  const lista = await prisma.listaEquipo.findFirst({
    where: { codigo: LISTA_CODIGO },
    select: { id: true, nombre: true, responsableId: true, proyectoId: true },
  })
  if (!lista) throw new Error(`No existe la lista ${LISTA_CODIGO}`)

  const existentes = await prisma.listaEquipoItem.findMany({
    where: { listaId: lista.id },
    select: { codigo: true },
  })
  const yaEstan = new Set(existentes.map(i => i.codigo.toUpperCase()))

  const categorias = await prisma.categoriaEquipo.findMany({ select: { id: true, nombre: true } })
  const unidades = await prisma.unidad.findMany({ select: { id: true, nombre: true } })
  const catPorNombre = new Map(categorias.map(c => [c.nombre, c.id]))
  const uniPorNombre = new Map(unidades.map(u => [u.nombre, u.id]))

  for (const b of BOM) {
    if (!catPorNombre.has(b.categoria)) throw new Error(`Categoría inexistente: ${b.categoria}`)
    if (!uniPorNombre.has(b.unidad)) throw new Error(`Unidad inexistente: ${b.unidad}`)
  }

  const cotizados = await prisma.proyectoEquipoCotizadoItem.findMany({
    where: { proyectoEquipoId: GRUPO_COTIZADO },
    select: { id: true, codigo: true, precioCliente: true },
  })
  const precioPorCotizado = new Map(cotizados.map(c => [c.id, c.precioCliente]))

  console.log(`Lista ${LISTA_CODIGO} — ${lista.nombre}`)
  console.log(`Ítems ya cargados: ${existentes.length}\n`)

  let creadosCatalogo = 0
  let creadosItem = 0

  for (const b of BOM) {
    // 1. El catálogo general. El precio queda en 0: la lista todavía no está
    //    cotizada y poner un número inventado sería peor que no tener ninguno.
    let catalogo = await prisma.catalogoEquipo.findFirst({
      where: { codigo: { equals: b.codigo, mode: 'insensitive' } },
      select: { id: true, codigo: true },
    })
    const enCatalogo = !!catalogo

    if (!catalogo && !DRY) {
      catalogo = await prisma.catalogoEquipo.create({
        data: {
          id: createId(),
          codigo: b.codigo,
          descripcion: b.descripcion,
          marca: b.marca,
          categoriaId: catPorNombre.get(b.categoria)!,
          unidadId: uniPorNombre.get(b.unidad)!,
          precioLista: 0,
          precioInterno: 0,
          precioVenta: 0,
          estado: 'pendiente',
          updatedAt: new Date(),
        },
        select: { id: true, codigo: true },
      })
      creadosCatalogo++
    } else if (!catalogo) {
      creadosCatalogo++
    }

    // 2. El ítem de la lista.
    const duplicado = yaEstan.has(b.codigo.toUpperCase())
    // 'cotizado' es el ítem que ya estaba en la cotización; 'nuevo', el que no.
    // El desglose del MV entra como nuevo: así lo exige el flujo de desglose
    // de la app, que solo acepta líneas sin otro vínculo.
    const origen = b.cotizadoId ? 'cotizado' : 'nuevo'
    const marcaLink = b.cotizadoId ? '→ cotizado' : b.desgloseDe ? '→ desglosa MV' : '  nuevo'

    console.log(
      `${duplicado ? 'ya está ' : 'crear   '} ${b.codigo.padEnd(24)} ` +
      `${String(b.cantidad).padStart(5)} ${b.unidad.padEnd(4)} ${marcaLink.padEnd(14)} ` +
      `cat:${enCatalogo ? 'sí' : 'CREAR'}`,
    )

    if (duplicado || DRY) continue

    const creado = await prisma.listaEquipoItem.create({
      data: {
        id: createId(),
        listaId: lista.id,
        proyectoEquipoId: GRUPO_COTIZADO,
        proyectoEquipoItemId: b.cotizadoId ?? null,
        desgloseDeProyectoEquipoCotizadoItemId: b.desgloseDe ?? null,
        presupuesto: b.cotizadoId ? (precioPorCotizado.get(b.cotizadoId) ?? null) : null,
        catalogoEquipoId: catalogo!.id,
        responsableId: lista.responsableId,
        codigo: b.codigo,
        descripcion: b.descripcion,
        categoria: b.categoria,
        tipoItem: 'equipo',
        unidad: b.unidad,
        marca: b.marca,
        cantidad: b.cantidad,
        origen,
        estado: 'borrador',
        updatedAt: new Date(),
      },
    })
    creadosItem++

    // El cotizado tiene que saber que ya está en una lista: es lo que hace
    // que el seguimiento de costo compare contra esta línea y no quede como
    // pendiente de pedir.
    if (b.cotizadoId) {
      await prisma.proyectoEquipoCotizadoItem.update({
        where: { id: b.cotizadoId },
        data: {
          listaId: lista.id,
          listaEquipoSeleccionadoId: creado.id,
          estado: 'en_lista',
          cantidadReal: b.cantidad,
        },
      })
    }
  }

  // El desglose del MV, como lo registra la app: la relación lista↔cotizado
  // aparte, y el cotizado marcado como desglosado.
  const hayDesglose = BOM.some(b => b.desgloseDe)
  if (hayDesglose && !DRY) {
    await prisma.desgloseEquipoItem.deleteMany({
      where: { proyectoEquipoCotizadoItemId: COTIZADO.varios },
    })
    await prisma.desgloseEquipoItem.create({
      data: {
        proyectoEquipoCotizadoItemId: COTIZADO.varios,
        listaEquipoId: lista.id,
        nota: 'Materiales varios desglosados en la lista de los 3 tableros',
      },
    })
    await prisma.proyectoEquipoCotizadoItem.update({
      where: { id: COTIZADO.varios },
      data: { listaId: lista.id, estado: 'desglosado' },
    })
    console.log('\nMV marcado como desglosado, con sus 9 líneas.')
  }

  console.log(`\n${DRY ? '[simulación] ' : ''}Ítems a crear: ${creadosItem || BOM.filter(b => !yaEstan.has(b.codigo.toUpperCase())).length}`)
  console.log(`${DRY ? '[simulación] ' : ''}Entradas de catálogo a crear: ${creadosCatalogo}`)
  if (DRY) console.log('\nSimulación. Para aplicar, quita --dry')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
