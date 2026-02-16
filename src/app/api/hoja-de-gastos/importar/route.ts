import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

async function generarNumero(): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `REQ-${yy}${mm}${dd}`

  const ultimo = await prisma.hojaDeGastos.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

interface ImportLinea {
  descripcion: string
  fecha: string
  monto: number
  moneda: string
  tipoComprobante: string | null
  numeroComprobante: string | null
  proveedorNombre: string | null
  proveedorRuc: string | null
}

interface ImportHoja {
  proyectoId: string | null
  centroCostoId: string | null
  empleadoId: string
  motivo: string
  montoAnticipo: number
  montoDepositado: number
  estado: string
  lineas: ImportLinea[]
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { hojas } = body as { hojas: ImportHoja[] }

    if (!Array.isArray(hojas) || hojas.length === 0) {
      return NextResponse.json({ error: 'No hay hojas para importar' }, { status: 400 })
    }

    if (hojas.length > 100) {
      return NextResponse.json({ error: 'Máximo 100 hojas por importación' }, { status: 400 })
    }

    let creadas = 0
    const errores: string[] = []

    for (let i = 0; i < hojas.length; i++) {
      const hoja = hojas[i]
      try {
        if (!hoja.empleadoId) {
          errores.push(`Hoja ${i + 1}: empleadoId requerido`)
          continue
        }
        if (!hoja.motivo?.trim()) {
          errores.push(`Hoja ${i + 1}: motivo requerido`)
          continue
        }
        if (!hoja.lineas || hoja.lineas.length === 0) {
          errores.push(`Hoja ${i + 1}: debe tener al menos una línea de gasto`)
          continue
        }
        if (!hoja.proyectoId && !hoja.centroCostoId) {
          errores.push(`Hoja ${i + 1}: requiere proyecto o centro de costo`)
          continue
        }

        const numero = await generarNumero()

        const lineasData = hoja.lineas.map(linea => ({
          descripcion: linea.descripcion,
          fecha: new Date(linea.fecha),
          monto: linea.monto,
          moneda: linea.moneda || 'PEN',
          tipoComprobante: linea.tipoComprobante || null,
          numeroComprobante: linea.numeroComprobante || null,
          proveedorNombre: linea.proveedorNombre || null,
          proveedorRuc: linea.proveedorRuc || null,
          updatedAt: new Date(),
        }))

        const montoGastado = lineasData.reduce((sum, l) => sum + l.monto, 0)
        const montoDepositado = hoja.montoDepositado || 0
        const montoAnticipo = hoja.montoAnticipo || 0
        const saldo = montoDepositado - montoGastado

        await prisma.hojaDeGastos.create({
          data: {
            numero,
            proyectoId: hoja.proyectoId || null,
            centroCostoId: hoja.centroCostoId || null,
            empleadoId: hoja.empleadoId,
            motivo: hoja.motivo.trim(),
            requiereAnticipo: montoAnticipo > 0,
            montoAnticipo,
            montoDepositado,
            montoGastado: Math.round(montoGastado * 100) / 100,
            saldo: Math.round(saldo * 100) / 100,
            estado: (hoja.estado || 'borrador') as any,
            updatedAt: new Date(),
            lineas: {
              create: lineasData,
            },
          },
        })
        creadas++
      } catch (err: any) {
        errores.push(`Hoja ${i + 1}: ${err.message}`)
      }
    }

    return NextResponse.json({
      creadas,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (error) {
    console.error('Error al importar hojas de gastos:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
