import { prisma } from '@/lib/prisma'
import { TipoMovimiento } from '@prisma/client'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

interface RegistrarMovimientoInput {
  almacenId: string
  tipo: TipoMovimiento
  catalogoEquipoId?: string
  catalogoHerramientaId?: string
  herramientaUnidadId?: string
  cantidad: number
  costoUnitario?: number  // Costo unitario (para entradas se guarda y se usa en el promedio; para salidas se guarda como evidencia)
  costoMoneda?: string    // 'PEN' | 'USD' (default 'PEN')
  usuarioId: string
  recepcionPendienteId?: string
  entregaItemId?: string
  prestamoHerramientaId?: string
  devolucionMaterialId?: string
  observaciones?: string
}

const TIPOS_ENTRADA: TipoMovimiento[] = [
  'entrada_recepcion',
  'devolucion_proyecto',
  'alta_herramienta',
  'devolucion_herramienta',
]

export async function registrarMovimiento(
  input: RegistrarMovimientoInput,
  tx?: TxClient
) {
  const db = tx ?? prisma
  const esEntrada = TIPOS_ENTRADA.includes(input.tipo) || input.tipo === 'ajuste_inventario'
  const esSalida = !TIPOS_ENTRADA.includes(input.tipo) && input.tipo !== 'ajuste_inventario'
  // Nota: `ajuste_inventario` se trata como entrada (cantidad positiva). Si se quiere
  // descontar, pasá un tipo de salida explícito o pasá cantidad negativa por convención.

  const delta = esEntrada ? input.cantidad : -input.cantidad

  const movimiento = await db.movimientoAlmacen.create({
    data: {
      almacenId: input.almacenId,
      tipo: input.tipo,
      catalogoEquipoId: input.catalogoEquipoId,
      catalogoHerramientaId: input.catalogoHerramientaId,
      herramientaUnidadId: input.herramientaUnidadId,
      cantidad: input.cantidad,
      costoUnitario: input.costoUnitario ?? null,
      costoMoneda: input.costoMoneda ?? 'PEN',
      usuarioId: input.usuarioId,
      recepcionPendienteId: input.recepcionPendienteId,
      entregaItemId: input.entregaItemId,
      prestamoHerramientaId: input.prestamoHerramientaId,
      devolucionMaterialId: input.devolucionMaterialId,
      observaciones: input.observaciones,
    },
  })

  if (input.catalogoEquipoId || input.catalogoHerramientaId) {
    // Traer stock actual para calcular promedio ponderado en entradas
    const stockActual = input.catalogoEquipoId
      ? await db.stockAlmacen.findUnique({
          where: { almacenId_catalogoEquipoId: { almacenId: input.almacenId, catalogoEquipoId: input.catalogoEquipoId } },
        })
      : await db.stockAlmacen.findUnique({
          where: { almacenId_catalogoHerramientaId: { almacenId: input.almacenId, catalogoHerramientaId: input.catalogoHerramientaId! } },
        })

    // Cálculo de nuevo costo promedio ponderado
    // - Si es entrada con costoUnitario: recalcular
    //   promedio = (stock_prev * costo_prev + cantidad_nueva * costo_nuevo) / (stock_prev + cantidad_nueva)
    // - Si es salida: mantener el promedio previo
    // - Si stock queda en 0: mantener el último promedio (por si vuelve a entrar)
    let nuevoPromedio: number | null = stockActual?.costoUnitarioPromedio ?? null
    let nuevaMoneda: string = stockActual?.costoMoneda ?? 'PEN'

    if (esEntrada && input.costoUnitario != null && input.costoUnitario > 0) {
      const stockPrev = stockActual?.cantidadDisponible ?? 0
      const costoPrev = stockActual?.costoUnitarioPromedio ?? 0
      const stockNuevo = stockPrev + input.cantidad
      if (stockNuevo > 0) {
        // Si hay cambio de moneda, no se puede promediar — prevalece la nueva
        if (costoPrev > 0 && stockPrev > 0 && (stockActual?.costoMoneda ?? 'PEN') === (input.costoMoneda ?? 'PEN')) {
          nuevoPromedio = (stockPrev * costoPrev + input.cantidad * input.costoUnitario) / stockNuevo
        } else {
          nuevoPromedio = input.costoUnitario
        }
        nuevaMoneda = input.costoMoneda ?? 'PEN'
      }
    }

    // Upsert del stock
    if (input.catalogoEquipoId) {
      await db.stockAlmacen.upsert({
        where: { almacenId_catalogoEquipoId: { almacenId: input.almacenId, catalogoEquipoId: input.catalogoEquipoId } },
        create: {
          almacenId: input.almacenId,
          catalogoEquipoId: input.catalogoEquipoId,
          cantidadDisponible: delta,
          costoUnitarioPromedio: nuevoPromedio,
          costoMoneda: nuevaMoneda,
        },
        update: {
          cantidadDisponible: { increment: delta },
          costoUnitarioPromedio: nuevoPromedio,
          costoMoneda: nuevaMoneda,
        },
      })
    } else {
      await db.stockAlmacen.upsert({
        where: { almacenId_catalogoHerramientaId: { almacenId: input.almacenId, catalogoHerramientaId: input.catalogoHerramientaId! } },
        create: {
          almacenId: input.almacenId,
          catalogoHerramientaId: input.catalogoHerramientaId!,
          cantidadDisponible: delta,
          costoUnitarioPromedio: nuevoPromedio,
          costoMoneda: nuevaMoneda,
        },
        update: {
          cantidadDisponible: { increment: delta },
          costoUnitarioPromedio: nuevoPromedio,
          costoMoneda: nuevaMoneda,
        },
      })
    }

    void esSalida // silence unused
  }

  return movimiento
}

export async function getAlmacenCentral(tx?: TxClient) {
  const db = tx ?? prisma
  const almacen = await db.almacen.findFirst({ where: { activo: true } })
  if (!almacen) throw new Error('No hay ningún almacén activo configurado')
  return almacen
}
