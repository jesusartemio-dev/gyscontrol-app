import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ADMIN = ['admin', 'gerente']

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  if (!q || q.length < 3) {
    return NextResponse.json({ message: 'Consulta muy corta' }, { status: 400 })
  }

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    'accept-language': 'es',
    countrycodes: 'pe',
  })

  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'GYS-Control-App/1.0 (asistencia-geocode)',
        Accept: 'application/json',
      },
    })
    if (!r.ok) {
      return NextResponse.json({ message: 'Error en servicio de geocoding' }, { status: 502 })
    }
    const data = (await r.json()) as Array<{
      display_name: string
      lat: string
      lon: string
      type: string
      importance: number
    }>

    const resultados = data.map(d => ({
      direccion: d.display_name,
      latitud: parseFloat(d.lat),
      longitud: parseFloat(d.lon),
      tipo: d.type,
      confianza: d.importance,
    }))
    return NextResponse.json(resultados)
  } catch (error) {
    console.error('[geocode]', error)
    return NextResponse.json({ message: 'Error al buscar dirección' }, { status: 500 })
  }
}
