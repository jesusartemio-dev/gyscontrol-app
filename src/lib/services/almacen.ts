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
  const esEntrada = TIPOS_ENTRADA.includes(input.tipo)
  const delta = esEntrada ? input.cantidad : -input.cantidad

  const movimiento = await db.movimientoAlmacen.create({
    data: {
      almacenId: input.almacenId,
      tipo: input.tipo,
      catalogoEquipoId: input.catalogoEquipoId,
      catalogoHerramientaId: input.catalogoHerramientaId,
      herramientaUnidadId: input.herramientaUnidadId,
      cantidad: input.cantidad,
      usuarioId: input.usuarioId,
      recepcionPendienteId: input.recepcionPendienteId,
      entregaItemId: input.entregaItemId,
      prestamoHerramientaId: input.prestamoHerramientaId,
      devolucionMaterialId: input.devolucionMaterialId,
      observaciones: input.observaciones,
    },
  })

  if (input.catalogoEquipoId || input.catalogoHerramientaId) {
    const where = input.catalogoEquipoId
      ? { almacenId_catalogoEquipoId: { almacenId: input.almacenId, catalogoEquipoId: input.catalogoEquipoId } }
      : { almacenId_catalogoHerramientaId: { almacenId: input.almacenId, catalogoHerramientaId: input.catalogoHerramientaId! } }

    const createData = input.catalogoEquipoId
      ? { almacenId: input.almacenId, catalogoEquipoId: input.catalogoEquipoId, cantidadDisponible: delta }
      : { almacenId: input.almacenId, catalogoHerramientaId: input.catalogoHerramientaId!, cantidadDisponible: delta }

    await db.stockAlmacen.upsert({
      where: where as any,
      create: createData,
      update: { cantidadDisponible: { increment: delta } },
    })
  }

  return movimiento
}

export async function getAlmacenCentral(tx?: TxClient) {
  const db = tx ?? prisma
  const almacen = await db.almacen.findFirst({ where: { activo: true } })
  if (!almacen) throw new Error('No hay ningún almacén activo configurado')
  return almacen
}
