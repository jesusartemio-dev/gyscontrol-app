/**
 * Crea un "Requerimiento del día" a partir de una Jornada de Campo en curso:
 * 1 línea "Alimentacion" (Almuerzo N personas) + N líneas "Movilizacion" (Pasajes
 * por persona), y la hoja queda directamente en estado 'enviado' (salta 'borrador'),
 * replicando el patrón de creado+enviado usado en el resto del módulo de Gastos.
 *
 * POST /api/hoja-de-gastos/requerimiento-del-dia
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generarNumeroHoja } from '@/lib/utils/generarNumeroHoja'

interface PasajePayload {
  usuarioId: string
  nombre: string
  monto: number
}

interface RequerimientoDelDiaPayload {
  registroCampoId: string
  montoAlmuerzo: number
  pasajes: PasajePayload[]
  // El cliente lo envía en true tras confirmar el aviso de "ya existe un REQ para
  // esta jornada" que devuelve este mismo endpoint con status 409.
  confirmarDuplicado?: boolean
}

const includeRelations = {
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  centroCosto: { select: { id: true, nombre: true, tipo: true } },
  empleado: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true, email: true } },
  lineas: {
    include: { categoriaGasto: true },
    orderBy: { fecha: 'asc' as const },
  },
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = (await req.json()) as RequerimientoDelDiaPayload

    if (!payload.registroCampoId) {
      return NextResponse.json({ error: 'Debe seleccionar una jornada' }, { status: 400 })
    }
    if (!Array.isArray(payload.pasajes)) {
      return NextResponse.json({ error: 'Falta el detalle de pasajes' }, { status: 400 })
    }

    const registroCampo = await prisma.registroHorasCampo.findUnique({
      where: { id: payload.registroCampoId },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true, clienteId: true } },
        tareas: {
          select: {
            miembros: { select: { usuarioId: true } },
          },
        },
      },
    })

    if (!registroCampo) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 })
    }
    if (registroCampo.estado !== 'iniciado') {
      return NextResponse.json({ error: 'La jornada ya no está en curso' }, { status: 400 })
    }

    const usuarioIdsJornada = new Set(
      registroCampo.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))
    )
    const cantidadMiembros = usuarioIdsJornada.size
    if (cantidadMiembros === 0) {
      return NextResponse.json({ error: 'La jornada no tiene personas registradas' }, { status: 400 })
    }

    if (!registroCampo.proyecto.clienteId) {
      return NextResponse.json(
        { error: 'El proyecto de esta jornada no tiene cliente asignado, no se pueden resolver tarifas' },
        { status: 400 }
      )
    }

    // El payload de pasajes debe coincidir exactamente con las personas de la jornada
    // (evita que el cliente mande un payload desincronizado del backend).
    const usuarioIdsPayload = new Set(payload.pasajes.map(p => p.usuarioId))
    if (
      payload.pasajes.length !== cantidadMiembros ||
      ![...usuarioIdsJornada].every(id => usuarioIdsPayload.has(id))
    ) {
      return NextResponse.json(
        { error: 'El detalle de pasajes no coincide con las personas de la jornada' },
        { status: 400 }
      )
    }

    const montoAlmuerzo = Number(payload.montoAlmuerzo)
    if (!Number.isFinite(montoAlmuerzo) || montoAlmuerzo < 0) {
      return NextResponse.json({ error: 'El monto de almuerzo debe ser un número válido mayor o igual a 0' }, { status: 400 })
    }
    for (const p of payload.pasajes) {
      const monto = Number(p.monto)
      if (!Number.isFinite(monto) || monto < 0) {
        return NextResponse.json({ error: `El monto de pasaje de "${p.nombre}" debe ser un número válido mayor o igual a 0` }, { status: 400 })
      }
    }

    // Búsqueda insensible a mayúsculas Y a tildes: en producción el catálogo tiene
    // "Alimentación"/"Movilización" con tilde; en otros entornos puede no tenerla.
    const [catAlimentacion, catMovilizacion] = await Promise.all([
      prisma.categoriaGasto.findFirst({
        where: { nombre: { in: ['Alimentacion', 'Alimentación'], mode: 'insensitive' } },
      }),
      prisma.categoriaGasto.findFirst({
        where: { nombre: { in: ['Movilizacion', 'Movilización'], mode: 'insensitive' } },
      }),
    ])
    if (!catAlimentacion) {
      return NextResponse.json(
        { error: 'Falta crear la categoría de gasto "Alimentación" en /catalogo/categorias-gasto' },
        { status: 400 }
      )
    }
    if (!catMovilizacion) {
      return NextResponse.json(
        { error: 'Falta crear la categoría de gasto "Movilización" en /catalogo/categorias-gasto' },
        { status: 400 }
      )
    }

    // Si ya existe un REQ del día para esta jornada, no crear otro sin confirmación
    // explícita del cliente (evita duplicados accidentales por doble clic, pero permite
    // crear intencionalmente un segundo REQ el mismo día si hace falta).
    if (!payload.confirmarDuplicado) {
      const yaExiste = await prisma.hojaDeGastos.findFirst({
        where: { origenRegistroCampoId: registroCampo.id },
        select: { id: true, numero: true },
        orderBy: { createdAt: 'desc' },
      })
      if (yaExiste) {
        return NextResponse.json(
          {
            error: `Ya existe un requerimiento del día para esta jornada (${yaExiste.numero}).`,
            codigo: 'ya_existe_requerimiento',
            hojaExistenteId: yaExiste.id,
          },
          { status: 409 }
        )
      }
    }

    const fechaLabel = registroCampo.fechaTrabajo.toISOString().slice(0, 10)
    const numero = await generarNumeroHoja()

    const hoja = await prisma.$transaction(async (tx) => {
      const creada = await tx.hojaDeGastos.create({
        data: {
          numero,
          proyectoId: registroCampo.proyectoId,
          categoriaCosto: 'gastos',
          tipoPropósito: 'gastos_viaticos',
          empleadoId: session.user.id,
          motivo: `Requerimiento del día — Jornada ${fechaLabel} (${registroCampo.proyecto.codigo})`,
          requiereAnticipo: true,
          estado: 'enviado',
          fechaEnvio: new Date(),
          origenRegistroCampoId: registroCampo.id,
          updatedAt: new Date(),
        },
      })

      await tx.gastoLinea.create({
        data: {
          hojaDeGastosId: creada.id,
          categoriaGastoId: catAlimentacion.id,
          descripcion: `Almuerzo ${cantidadMiembros} personas`,
          fecha: registroCampo.fechaTrabajo,
          monto: montoAlmuerzo,
          updatedAt: new Date(),
        },
      })

      for (const p of payload.pasajes) {
        await tx.gastoLinea.create({
          data: {
            hojaDeGastosId: creada.id,
            categoriaGastoId: catMovilizacion.id,
            descripcion: `Pasajes ${p.nombre}`,
            fecha: registroCampo.fechaTrabajo,
            monto: Number(p.monto),
            updatedAt: new Date(),
          },
        })
      }

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: creada.id,
          tipo: 'creado',
          descripcion: `Requerimiento del día ${numero} creado automáticamente desde la jornada ${fechaLabel}`,
          estadoNuevo: 'borrador',
          usuarioId: session.user.id,
        },
      })
      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: creada.id,
          tipo: 'enviado',
          descripcion: 'Enviado automáticamente al crear el requerimiento del día',
          estadoAnterior: 'borrador',
          estadoNuevo: 'enviado',
          usuarioId: session.user.id,
        },
      })

      return tx.hojaDeGastos.findUniqueOrThrow({ where: { id: creada.id }, include: includeRelations })
    })

    return NextResponse.json(hoja)
  } catch (error) {
    console.error('Error al crear requerimiento del día:', error)
    return NextResponse.json({ error: 'Error al crear requerimiento del día' }, { status: 500 })
  }
}
