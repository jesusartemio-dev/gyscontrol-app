// Script de backfill: rellena ubicacionId y distanciaMetros para marcajes
// históricos hechos con "Marcar sin QR" (metodoMarcaje='gps_directo') que
// tienen coordenadas GPS pero ubicacionId=null.
//
// Preserva el metodoMarcaje='gps_directo' para que el supervisor pueda
// seguir identificando a quienes marcaron sin escanear el QR.
//
// Uso:
//   npx tsx scripts/backfill-ubicacion-gps-directo.ts                 # local (.env)
//   npx dotenv -e .env.production -- npx tsx scripts/backfill-ubicacion-gps-directo.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Haversine: distancia en metros entre dos coords GPS.
function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const RADIO_AUTO_ASIGNACION = 500 // mismo umbral que el endpoint de marcaje

async function main() {
  // Ubicaciones activas contra las cuales comparar
  const ubicaciones = await prisma.ubicacion.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, latitud: true, longitud: true, radioMetros: true },
  })
  console.log(`📍 ${ubicaciones.length} ubicaciones activas`)

  // Marcajes sin ubicación pero con coords GPS, que fueron gps_directo
  const pendientes = await prisma.asistencia.findMany({
    where: {
      ubicacionId: null,
      latitud: { not: null },
      longitud: { not: null },
      metodoMarcaje: 'gps_directo',
    },
    select: { id: true, latitud: true, longitud: true, userId: true, fechaHora: true },
  })
  console.log(`📋 ${pendientes.length} marcajes "sin QR" con coords GPS a revisar`)

  if (pendientes.length === 0) {
    console.log('✅ Nada que hacer.')
    return
  }

  let asignados = 0
  let lejos = 0
  const porUbicacion = new Map<string, number>()

  for (const a of pendientes) {
    if (a.latitud == null || a.longitud == null) continue

    let mejor: { id: string; nombre: string; distancia: number; radio: number } | null = null
    for (const u of ubicaciones) {
      const d = haversineMetros(a.latitud, a.longitud, u.latitud, u.longitud)
      const umbral = Math.max(u.radioMetros, RADIO_AUTO_ASIGNACION)
      if (d <= umbral && (!mejor || d < mejor.distancia)) {
        mejor = { id: u.id, nombre: u.nombre, distancia: d, radio: u.radioMetros }
      }
    }

    if (mejor) {
      await prisma.asistencia.update({
        where: { id: a.id },
        data: {
          ubicacionId: mejor.id,
          distanciaMetros: mejor.distancia,
          dentroGeofence: mejor.distancia <= mejor.radio,
        },
      })
      asignados++
      porUbicacion.set(mejor.nombre, (porUbicacion.get(mejor.nombre) || 0) + 1)
    } else {
      lejos++
    }
  }

  console.log(`\n✅ Backfill completado:`)
  console.log(`   ${asignados} marcajes vinculados a su ubicación más cercana`)
  console.log(`   ${lejos} marcajes quedan sin ubicación (muy lejos de cualquier sede)`)
  if (porUbicacion.size > 0) {
    console.log(`\n📊 Asignaciones por ubicación:`)
    for (const [nombre, count] of Array.from(porUbicacion.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${nombre}: ${count}`)
    }
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
