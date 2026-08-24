import { tieneRol } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerTipoCambioSunatVenta } from '@/lib/utils/consultaSunat'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']
// Decolecta tiene rate-limit estricto (probado: 4 fechas en paralelo ya devuelven
// 429 en la mitad) — se pide de a 2 con reintento (ver obtenerTipoCambioSunatVenta).
const CONCURRENCIA = 2

// POST /api/administracion/tipo-cambio-sunat  { fechas: string[] } (YYYY-MM-DD)
// Devuelve { [fecha]: ventaOMonto | null } — usado para convertir el reporte
// Contable de CxC a una sola moneda (ver exportarCxCContable, monedaReporte).
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!tieneRol(session, ROLES_ALLOWED)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await req.json()
    const fechas: string[] = Array.isArray(body?.fechas) ? body.fechas : []
    const unicas = [...new Set(fechas)].filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f))

    const resultado: Record<string, number | null> = {}
    for (let i = 0; i < unicas.length; i += CONCURRENCIA) {
      const lote = unicas.slice(i, i + CONCURRENCIA)
      const tasas = await Promise.all(lote.map(f => obtenerTipoCambioSunatVenta(f)))
      lote.forEach((f, idx) => { resultado[f] = tasas[idx] })
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Error al obtener tipo de cambio SUNAT:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
