// ===================================================
// 📁 Archivo: distribuir/route.ts
// 📌 Ubicación: src/app/api/lista-equipo/from-proyecto-equipo/distribuir/route.ts
// 🔧 Descripción: API para distribución avanzada de ProyectoEquipo en múltiples ListaEquipo
//
// 🧠 Uso: Endpoint para crear múltiples listas desde un ProyectoEquipo con distribución granular
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarCreacion } from '@/lib/services/audit'
import { parseDateOnly } from '@/lib/utils'

interface DistribucionPayload {
  proyectoId: string
  proyectoEquipoId: string
  nombre: string
  descripcion: string
  fechaNecesaria?: string
  itemsIds: string[]
}

export async function POST(req: Request) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const payload: DistribucionPayload = await req.json()
    const { proyectoId, proyectoEquipoId, nombre, descripcion, fechaNecesaria, itemsIds } = payload

    // ✅ Validar parámetros
    if (!proyectoId || !proyectoEquipoId || !nombre || !itemsIds || itemsIds.length === 0) {
      return NextResponse.json(
        { error: 'Parámetros incompletos: proyectoId, proyectoEquipoId, nombre, descripcion e itemsIds son requeridos' },
        { status: 400 }
      )
    }

    // ✅ Verificar que el ProyectoEquipo existe y pertenece al proyecto
    const proyectoEquipo = await prisma.proyectoEquipoCotizado.findFirst({
      where: {
        id: proyectoEquipoId,
        proyectoId: proyectoId
      },
      include: {
        proyecto: true
      }
    })

    if (!proyectoEquipo) {
      return NextResponse.json(
        { error: 'ProyectoEquipo no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Validar que todos los items existen y pertenecen al ProyectoEquipo
    const proyectoEquipoItems = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: {
        id: { in: itemsIds },
        proyectoEquipoId: proyectoEquipoId
      }
    })

    if (proyectoEquipoItems.length !== itemsIds.length) {
      return NextResponse.json(
        { error: 'Algunos items no existen o no pertenecen al ProyectoEquipo' },
        { status: 400 }
      )
    }

    // ✅ Verificar que los items NO estén ya en listas activas (evitar duplicados)
    const itemsYaEnListas = proyectoEquipoItems.filter(item =>
      item.estado === 'en_lista' && item.listaId !== null
    )
    if (itemsYaEnListas.length > 0) {
      return NextResponse.json(
        {
          error: `Los siguientes items ya están asignados a listas activas: ${itemsYaEnListas.map(item => item.descripcion || 'Sin descripción').join(', ')}`
        },
        { status: 400 }
      )
    }

    // ✅ Verificar que los items no estén asignados a otras listas (pero permitir múltiples listas)
    const itemsEnOtrasListas = proyectoEquipoItems.filter(item =>
      item.estado === 'pendiente' && item.listaId !== null
    )
    if (itemsEnOtrasListas.length > 0) {
      // Esto es válido - los items pueden estar en múltiples listas
      console.log(`Items en múltiples listas: ${itemsEnOtrasListas.length}`)
    }

    // ✅ Obtener el número de secuencia para este proyecto
    const ultimoNumero = await prisma.listaEquipo.findFirst({
      where: { proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
      select: { numeroSecuencia: true }
    })

    const numeroSecuencia = (ultimoNumero?.numeroSecuencia || 0) + 1

    // ✅ Generar código siguiendo el patrón estándar: {codigoProyecto}-LST-{correlativo}
    const codigo = `${proyectoEquipo.proyecto.codigo}-LST-${String(numeroSecuencia).padStart(3, '0')}`

    // ✅ Crear la ListaEquipo en una transacción
    const nuevaLista = await prisma.$transaction(async (tx) => {
      // 1. Crear la ListaEquipo
      const lista = await tx.listaEquipo.create({
        data: {
          id: crypto.randomUUID(),
          codigo,
          nombre,
          estado: 'borrador',
          numeroSecuencia,
          proyectoId,
          responsableId: session.user.id,
          fechaNecesaria: fechaNecesaria ? parseDateOnly(fechaNecesaria) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // 2. Crear los ListaEquipoItem desde los ProyectoEquipoItem seleccionados
      for (const [index, itemId] of itemsIds.entries()) {
        const proyectoItem = proyectoEquipoItems.find(item => item.id === itemId)
        if (!proyectoItem) continue

        await tx.listaEquipoItem.create({
          data: {
            id: crypto.randomUUID(),
            listaId: lista.id,
            proyectoEquipoItemId: proyectoItem.id,
            codigo: proyectoItem.codigo,
            descripcion: proyectoItem.descripcion,
            marca: proyectoItem.marca || '',
            categoria: proyectoItem.categoria || '',
            unidad: proyectoItem.unidad || 'UND',
            cantidad: proyectoItem.cantidad,
            cantidadPedida: 0,
            presupuesto: proyectoItem.precioCliente || 0,
            estado: 'borrador',
            origen: 'cotizado' as const,
            responsableId: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      // 3. Asociar los ProyectoEquipoItem a la lista (mantener estado 'pendiente')
      // Solo cambiar a 'en_lista' cuando se convierta en pedido
      await tx.proyectoEquipoCotizadoItem.updateMany({
        where: {
          id: { in: itemsIds }
        },
        data: {
          listaId: lista.id
        }
      })

      return lista
    })

    // ✅ Registrar la creación en el sistema de auditoría
    try {
      const descripcionCompleta = `Se creó lista de equipo ${nuevaLista.codigo} "${nombre}" en proyecto "${proyectoEquipo.proyecto.nombre}" (${itemsIds.length} items) - Método inteligente`

      await registrarCreacion(
        'LISTA_EQUIPO',
        nuevaLista.id,
        session.user.id,
        descripcionCompleta,
        {
          proyectoId,
          proyectoEquipoId,
          proyectoNombre: proyectoEquipo.proyecto.nombre,
          proyectoCodigo: proyectoEquipo.proyecto.codigo,
          itemsCount: itemsIds.length,
          codigo: nuevaLista.codigo,
          metodo: 'distribucion_inteligente'
        }
      )
      console.log('✅ Auditoría registrada para lista:', nuevaLista.id, 'con código:', nuevaLista.codigo)
    } catch (auditError) {
      console.error('⚠️ Error al registrar auditoría:', auditError)
      // No fallar la operación por error de auditoría
    }

    // ✅ Retornar la lista creada con sus items
    const listaCompletaRaw = await prisma.listaEquipo.findUnique({
      where: { id: nuevaLista.id },
      include: {
        proyecto: true,
        user: true,
        listaEquipoItem: {
          include: {
            proyectoEquipoItem: {
              include: {
                proyectoEquipoCotizado: true
              }
            }
          }
        }
      }
    })

    // Map for frontend compatibility
    const listaCompleta = listaCompletaRaw ? {
      ...listaCompletaRaw,
      responsable: listaCompletaRaw.user,
      items: listaCompletaRaw.listaEquipoItem
    } : null

    return NextResponse.json({
      ...listaCompleta,
      message: 'Lista técnica creada exitosamente desde distribución avanzada'
    })

  } catch (error) {
    console.error('Error en distribución avanzada:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la lista técnica' },
      { status: 500 }
    )
  }
}
