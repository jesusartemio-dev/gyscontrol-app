/**
 * Script de migración: crea HojaDeGastosEvento para registros existentes
 * basándose en las fechas de cada HojaDeGastos.
 *
 * Ejecutar: npx tsx scripts/migrate-hoja-eventos.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const hojas = await prisma.hojaDeGastos.findMany({
    select: {
      id: true,
      numero: true,
      estado: true,
      aprobadorId: true,
      empleadoId: true,
      rechazadoEn: true,
      comentarioRechazo: true,
      montoDepositado: true,
      montoAnticipo: true,
      montoGastado: true,
      saldo: true,
      createdAt: true,
      fechaEnvio: true,
      fechaAprobacion: true,
      fechaDeposito: true,
      fechaRendicion: true,
      fechaValidacion: true,
      fechaCierre: true,
      _count: { select: { eventos: true } },
    },
  })

  let created = 0
  let skipped = 0

  for (const hoja of hojas) {
    // Skip if already has events
    if (hoja._count.eventos > 0) {
      skipped++
      continue
    }

    const eventos: Array<{
      hojaDeGastosId: string
      tipo: string
      descripcion: string
      estadoAnterior?: string
      estadoNuevo?: string
      usuarioId?: string
      metadata?: any
      creadoEn: Date
    }> = []

    // Evento "creado"
    eventos.push({
      hojaDeGastosId: hoja.id,
      tipo: 'creado',
      descripcion: `Requerimiento ${hoja.numero} creado`,
      estadoNuevo: 'borrador',
      usuarioId: hoja.empleadoId,
      creadoEn: hoja.createdAt,
    })

    // Evento "enviado"
    if (hoja.fechaEnvio) {
      eventos.push({
        hojaDeGastosId: hoja.id,
        tipo: 'enviado',
        descripcion: 'Enviado para aprobacion',
        estadoAnterior: 'borrador',
        estadoNuevo: 'enviado',
        usuarioId: hoja.empleadoId,
        creadoEn: hoja.fechaEnvio,
      })
    }

    // Evento "aprobado"
    if (hoja.fechaAprobacion) {
      eventos.push({
        hojaDeGastosId: hoja.id,
        tipo: 'aprobado',
        descripcion: 'Aprobado',
        estadoAnterior: 'enviado',
        estadoNuevo: 'aprobado',
        usuarioId: hoja.aprobadorId || undefined,
        creadoEn: hoja.fechaAprobacion,
      })
    }

    // Evento "depositado"
    if (hoja.fechaDeposito) {
      eventos.push({
        hojaDeGastosId: hoja.id,
        tipo: 'depositado',
        descripcion: `Deposito registrado: S/ ${hoja.montoDepositado.toFixed(2)}`,
        estadoAnterior: 'aprobado',
        estadoNuevo: 'depositado',
        usuarioId: undefined,
        metadata: { monto: hoja.montoDepositado, montoAnticipo: hoja.montoAnticipo },
        creadoEn: hoja.fechaDeposito,
      })
    }

    // Evento "rendido"
    if (hoja.fechaRendicion) {
      eventos.push({
        hojaDeGastosId: hoja.id,
        tipo: 'rendido',
        descripcion: `Rendicion enviada. Monto gastado: S/ ${hoja.montoGastado.toFixed(2)}`,
        estadoAnterior: hoja.fechaDeposito ? 'depositado' : 'aprobado',
        estadoNuevo: 'rendido',
        usuarioId: hoja.empleadoId,
        metadata: { montoGastado: hoja.montoGastado, saldo: hoja.saldo },
        creadoEn: hoja.fechaRendicion,
      })
    }

    // Evento "validado"
    if (hoja.fechaValidacion) {
      eventos.push({
        hojaDeGastosId: hoja.id,
        tipo: 'validado',
        descripcion: 'Validado',
        estadoAnterior: 'rendido',
        estadoNuevo: 'validado',
        usuarioId: undefined,
        creadoEn: hoja.fechaValidacion,
      })
    }

    // Evento "cerrado"
    if (hoja.fechaCierre) {
      eventos.push({
        hojaDeGastosId: hoja.id,
        tipo: 'cerrado',
        descripcion: 'Cerrado',
        estadoAnterior: 'validado',
        estadoNuevo: 'cerrado',
        usuarioId: undefined,
        creadoEn: hoja.fechaCierre,
      })
    }

    // Evento "rechazado" (if currently rejected)
    if (hoja.estado === 'rechazado' && hoja.rechazadoEn) {
      eventos.push({
        hojaDeGastosId: hoja.id,
        tipo: 'rechazado',
        descripcion: `Rechazado en etapa ${hoja.rechazadoEn}: ${hoja.comentarioRechazo || 'Sin comentario'}`,
        estadoNuevo: 'rechazado',
        metadata: { etapa: hoja.rechazadoEn, comentario: hoja.comentarioRechazo },
        creadoEn: new Date(), // No tenemos fecha exacta del rechazo
      })
    }

    if (eventos.length > 0) {
      await prisma.hojaDeGastosEvento.createMany({ data: eventos })
      created += eventos.length
    }
  }

  console.log(`Migracion completada: ${created} eventos creados, ${skipped} hojas ya tenian eventos (${hojas.length} hojas procesadas)`)
}

main()
  .catch((e) => {
    console.error('Error en migracion:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
