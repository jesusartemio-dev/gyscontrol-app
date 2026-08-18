// Fusión de 2 filas de Proveedor duplicadas: mueve todas las FK de la fila
// "descartada" hacia la fila "conservada" en las 5 tablas que referencian
// Proveedor, sincroniza el snapshot de texto PedidoEquipoItem.proveedorNombre
// (que no se actualiza solo), verifica 0 referencias remanentes, y borra la
// fila descartada (Opción A — sin campo de estado en Proveedor, ver
// project_oc_importacion_local.md).
//
// Por defecto corre en modo DRY-RUN (solo imprime conteos, no escribe nada).
// Pasar --aplicar para ejecutar de verdad.
//
// Uso:
//   npx tsx scripts/fusionar-proveedores.ts <conservarId> <descartarId> [--copiar-contacto] [--aplicar]
//   npx dotenv -e .env.production -o -- npx tsx scripts/fusionar-proveedores.ts <conservarId> <descartarId> --aplicar

import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

const [, , conservarId, descartarId, ...flags] = process.argv
const APLICAR = flags.includes('--aplicar')
const COPIAR_CONTACTO = flags.includes('--copiar-contacto')

type Cliente = PrismaClient | Prisma.TransactionClient

async function contarReferencias(client: Cliente, proveedorId: string) {
  const [cotizaciones, listaItems, pedidoItems, ordenes, cuentas] = await Promise.all([
    client.cotizacionProveedor.count({ where: { proveedorId } }),
    client.listaEquipoItem.count({ where: { proveedorId } }),
    client.pedidoEquipoItem.count({ where: { proveedorId } }),
    client.ordenCompra.count({ where: { proveedorId } }),
    client.cuentaPorPagar.count({ where: { proveedorId } }),
  ])
  return { cotizaciones, listaItems, pedidoItems, ordenes, cuentas, total: cotizaciones + listaItems + pedidoItems + ordenes + cuentas }
}

async function main() {
  if (!conservarId || !descartarId) {
    console.error('Uso: fusionar-proveedores.ts <conservarId> <descartarId> [--copiar-contacto] [--aplicar]')
    process.exit(1)
  }

  const [conservar, descartar] = await Promise.all([
    prisma.proveedor.findUnique({ where: { id: conservarId } }),
    prisma.proveedor.findUnique({ where: { id: descartarId } }),
  ])
  if (!conservar || !descartar) {
    console.error('No se encontró alguna de las 2 filas.')
    process.exit(1)
  }

  console.log(`Conservar: ${conservar.nombre} (${conservar.id})`)
  console.log(`Descartar: ${descartar.nombre} (${descartar.id})`)

  console.log('\nReferencias ANTES:')
  const antesConservar = await contarReferencias(prisma, conservarId)
  const antesDescartar = await contarReferencias(prisma, descartarId)
  console.log('  conservada:', antesConservar)
  console.log('  descartada:', antesDescartar)

  if (COPIAR_CONTACTO) {
    console.log('\n--copiar-contacto: se copiará correo/dirección/teléfono/contacto de la descartada hacia la conservada (solo campos donde la conservada esté vacía).')
  }

  if (!APLICAR) {
    console.log('\n🔎 DRY-RUN — no se escribió nada. Pasar --aplicar para ejecutar de verdad.')
    return
  }

  await prisma.$transaction(async (tx) => {
    if (COPIAR_CONTACTO) {
      const data: Record<string, any> = { updatedAt: new Date() }
      if (!conservar.correo && descartar.correo) data.correo = descartar.correo
      if (!conservar.direccion && descartar.direccion) data.direccion = descartar.direccion
      if (!conservar.telefono && descartar.telefono) data.telefono = descartar.telefono
      if (!conservar.contactoNombre && descartar.contactoNombre) data.contactoNombre = descartar.contactoNombre
      if (!conservar.contactoTelefono && descartar.contactoTelefono) data.contactoTelefono = descartar.contactoTelefono
      if (!conservar.contactoCorreo && descartar.contactoCorreo) data.contactoCorreo = descartar.contactoCorreo
      if (Object.keys(data).length > 1) {
        await tx.proveedor.update({ where: { id: conservarId }, data })
        console.log('✅ Contacto copiado:', data)
      } else {
        console.log('ℹ️  Nada que copiar (la conservada ya tenía todos los campos llenos).')
      }
    }

    const rCot = await tx.cotizacionProveedor.updateMany({ where: { proveedorId: descartarId }, data: { proveedorId: conservarId } })
    const rLista = await tx.listaEquipoItem.updateMany({ where: { proveedorId: descartarId }, data: { proveedorId: conservarId } })
    const rPedido = await tx.pedidoEquipoItem.updateMany({ where: { proveedorId: descartarId }, data: { proveedorId: conservarId, proveedorNombre: conservar.nombre } })
    const rOc = await tx.ordenCompra.updateMany({ where: { proveedorId: descartarId }, data: { proveedorId: conservarId } })
    const rCxp = await tx.cuentaPorPagar.updateMany({ where: { proveedorId: descartarId }, data: { proveedorId: conservarId } })

    console.log('\n✅ Movido:', { cotizaciones: rCot.count, listaItems: rLista.count, pedidoItems: rPedido.count, ordenes: rOc.count, cuentas: rCxp.count })

    const despuesDescartar = await contarReferencias(tx, descartarId)
    console.log('Referencias remanentes en la descartada (deben ser 0):', despuesDescartar)
    if (despuesDescartar.total !== 0) {
      throw new Error('Quedaron referencias sin mover — abortando, no se borra la fila descartada.')
    }

    await tx.proveedor.delete({ where: { id: descartarId } })
    console.log(`✅ Fila descartada eliminada: ${descartar.nombre} (${descartarId})`)
  })

  const final = await prisma.proveedor.findUnique({ where: { id: conservarId } })
  const refsFinal = await contarReferencias(prisma, conservarId)
  console.log('\n=== Estado final de la fila conservada ===')
  console.log(final)
  console.log('Referencias:', refsFinal)
}

main()
  .catch(e => {
    console.error('❌', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
