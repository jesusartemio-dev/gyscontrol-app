import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { obtenerSedeRemotaActiva, determinarModoRemoto } from '@/lib/services/asistencia'
import { haversineMetros } from '@/lib/utils/geofence'

const TOP_N = 5

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get('lat') || '')
  const lon = parseFloat(url.searchParams.get('lon') || '')
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ message: 'Coordenadas inválidas' }, { status: 400 })
  }

  const userId = session.user.id

  const [ubicaciones, sedeRemota, modoRemoto] = await Promise.all([
    prisma.ubicacion.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, tipo: true, latitud: true, longitud: true, radioMetros: true },
    }),
    obtenerSedeRemotaActiva(userId),
    determinarModoRemoto(userId),
  ])

  const sedesConDistancia = ubicaciones
    .map(u => {
      const distancia = haversineMetros(lat, lon, u.latitud, u.longitud)
      return {
        id: u.id,
        nombre: u.nombre,
        tipo: u.tipo,
        distanciaMetros: Math.round(distancia),
        radioMetros: u.radioMetros,
        dentro: distancia <= u.radioMetros,
      }
    })
    .sort((a, b) => a.distanciaMetros - b.distanciaMetros)

  const sedeEnZona = sedesConDistancia.find(s => s.dentro) || null

  let sedeRemotaInfo: {
    id: string
    nombre: string
    distanciaMetros: number
    radioMetros: number
    dentro: boolean
  } | null = null
  if (sedeRemota) {
    const distRemota = haversineMetros(lat, lon, sedeRemota.latitud, sedeRemota.longitud)
    sedeRemotaInfo = {
      id: sedeRemota.id,
      nombre: sedeRemota.nombre,
      distanciaMetros: Math.round(distRemota),
      radioMetros: sedeRemota.radioMetros,
      dentro: distRemota <= sedeRemota.radioMetros,
    }
  }

  return NextResponse.json({
    sedeEnZona,
    sedesCercanas: sedesConDistancia.slice(0, TOP_N),
    sedeRemota: sedeRemotaInfo,
    modoRemoto: {
      esRemoto: modoRemoto.esRemoto,
      esConfianza: modoRemoto.esConfianza ?? false,
      razon: modoRemoto.razon ?? null,
    },
  })
}
