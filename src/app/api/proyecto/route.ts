import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { esCodigoClienteAutomatico } from '@/lib/utils/clienteCodeGenerator'

export async function GET() {
  try {
    const proyectosRaw = await prisma.proyecto.findMany({
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
        proyectoEquipoCotizado: true,
        proyectoServicioCotizado: true,
        proyectoGastoCotizado: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 🔄 Frontend compatibility mapping
    const proyectos = proyectosRaw.map((proyecto: any) => ({
      ...proyecto,
      equipos: proyecto.proyectoEquipoCotizado,
      servicios: proyecto.proyectoServicioCotizado,
      gastos: proyecto.proyectoGastoCotizado
    }))

    return NextResponse.json(proyectos)
  } catch (error) {
    console.error('❌ Error en GET /api/proyecto:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyectos' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const data = await req.json()

    // Validaciones básicas
    if (!data.clienteId || !data.comercialId || !data.gestorId || !data.nombre) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      )
    }

    // Determinar código del proyecto
    let codigoProyecto: string

    if (data.codigo && data.codigo.trim()) {
      // Código proporcionado manualmente (creación sin cotización)
      codigoProyecto = data.codigo.trim()
    } else {
      // Auto-generar código desde el cliente
      const cliente = await prisma.cliente.findUnique({
        where: { id: data.clienteId },
        select: { codigo: true, numeroSecuencia: true, nombre: true }
      })

      if (!cliente) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        )
      }

      // ⚠️ Si el cliente aún tiene el código automático (CLI-XXXX-YY), el
      // proyecto saldría con un código largo sin sentido. Se bloquea para que
      // primero le asignen un código propio al cliente.
      if (esCodigoClienteAutomatico(cliente.codigo)) {
        return NextResponse.json({
          error: `El cliente "${cliente.nombre}" todavía tiene un código automático (${cliente.codigo}). Asígnale un código propio en Comercial > Clientes antes de crear el proyecto.`
        }, { status: 400 })
      }

      const nuevoNumero = (cliente.numeroSecuencia || 0) + 1
      codigoProyecto = `${cliente.codigo}-${String(nuevoNumero).padStart(3, '0')}`

      // Actualizar el número de secuencia del cliente
      await prisma.cliente.update({
        where: { id: data.clienteId },
        data: { numeroSecuencia: nuevoNumero }
      })
    }

    // Crear proyecto
    const nuevoProyecto = await prisma.proyecto.create({
      data: {
        id: crypto.randomUUID(),
        clienteId: data.clienteId,
        comercialId: data.comercialId,
        gestorId: data.gestorId,
        supervisorId: data.supervisorId || undefined,
        liderId: data.liderId || undefined,
        cotizacionId: data.cotizacionId || undefined,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        codigo: codigoProyecto,
        totalEquiposInterno: data.totalEquiposInterno || 0,
        totalServiciosInterno: data.totalServiciosInterno || 0,
        totalGastosInterno: data.totalGastosInterno || 0,
        totalInterno: data.totalInterno || 0,
        totalCliente: data.totalCliente || 0,
        descuento: data.descuento || 0,
        grandTotal: data.grandTotal || 0,
        moneda: data.moneda || 'USD',
        tipoCambio: data.tipoCambio || null,
        estado: data.estado === 'activo' ? 'en_ejecucion' : (data.estado || 'creado'),
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        updatedAt: new Date(),
      },
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
      }
    })

    // ✅ Auditoría removida temporalmente por refactorización

    return NextResponse.json(nuevoProyecto, { status: 201 })
  } catch (error) {
    console.error('❌ Error en POST /api/proyecto:', error)
    return NextResponse.json(
      { error: 'Error al crear proyecto' },
      { status: 500 }
    )
  }
}
