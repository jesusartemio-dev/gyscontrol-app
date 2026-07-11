import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generarDocxMatriz } from '@/lib/matrizComunicacion/exportDocx'
import { generarSiglas, calcularNivelesOrgNodos, NIVELES_PARTICIPANTES_MATRIZ } from '@/lib/matrizComunicacion/utils'
import { ROL_CONTACTO_CLIENTE_LABELS } from '@/lib/config/rolesContactoCliente'
import { renderMatrizPlantillaOficial } from '@/lib/matrizComunicacion/plantillaOficial/renderizar'
import { EMPRESA_CORTA_GYS } from '@/lib/matrizComunicacion/codigoDocumentoAsistente'
import { ordenarPorJerarquiaCargo } from '@/lib/matrizComunicacion/ordenContactos'

function parseCeldas(json: string): { siglas: string; valor: string }[] {
  try {
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    if (arr.length > 0 && typeof arr[0] === 'object' && 'siglas' in arr[0]) return arr
    return []
  } catch {
    return []
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const [matriz, proyecto] = await Promise.all([
      prisma.matrizComunicacion.findUnique({
        where: { proyectoId },
        include: { filas: { orderBy: { orden: 'asc' } } },
      }),
      prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          nombre: true,
          codigo: true,
          sede: true,
          etapa: true,
          ordenCompraCliente: true,
          cliente: { select: { nombre: true, nombreCorto: true, logoUrl: true } },
          orgNodos: {
            // Se traen TODOS los nodos (no solo los que tienen usuario) para poder
            // calcular el nivel de cada uno recorriendo la cadena de padres completa.
            orderBy: { orden: 'asc' },
            select: {
              id: true,
              parentId: true,
              userId: true,
              cargoLabel: true,
              empresaOverride: true,
              telefonoOverride: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  empleado: { select: { telefono: true } },
                },
              },
            },
          },
        },
      }),
    ])

    if (!matriz) return NextResponse.json({ error: 'Matriz no encontrada' }, { status: 404 })
    if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const niveles = calcularNivelesOrgNodos(proyecto.orgNodos)
    const seenUserIds = new Set<string>()
    const usadas = new Set<string>()
    const personalGys = ordenarPorJerarquiaCargo(
      proyecto.orgNodos
        .filter(n => {
          if (!n.user?.name || !n.userId) return false
          if (!NIVELES_PARTICIPANTES_MATRIZ.includes(niveles.get(n.id) as 2 | 3 | 4)) return false
          if (seenUserIds.has(n.userId)) return false
          seenUserIds.add(n.userId)
          return true
        })
        .map(n => {
          const siglas = generarSiglas(n.user!.name!, usadas)
          usadas.add(siglas)
          return {
            siglas,
            nombre: n.user!.name!,
            cargo: n.cargoLabel,
            empresa: n.empresaOverride ?? EMPRESA_CORTA_GYS,
            celular: n.telefonoOverride ?? n.user?.empleado?.telefono ?? '',
            correo: n.user!.email,
          }
        })
    )

    // El contacto del cliente encabeza la tabla — así es el formato real del
    // entregable (ej. el supervisor del cliente va primero, no el equipo GYS).
    const contactosCliente = await prisma.proyectoContactoCliente.findMany({
      where: { proyectoId },
      include: { crmContacto: { select: { nombre: true, email: true, celular: true, telefono: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const empresaCliente = proyecto.cliente?.nombreCorto || proyecto.cliente?.nombre || 'Cliente'
    const personalCliente = contactosCliente.map(cc => {
      const siglas = generarSiglas(cc.crmContacto.nombre, usadas)
      usadas.add(siglas)
      return {
        siglas,
        nombre: cc.crmContacto.nombre,
        cargo: ROL_CONTACTO_CLIENTE_LABELS[cc.rolEnProyecto] ?? cc.rolEnProyecto,
        empresa: empresaCliente,
        celular: cc.crmContacto.celular ?? cc.crmContacto.telefono ?? '',
        correo: cc.crmContacto.email ?? '',
      }
    })

    const personal = [...personalCliente, ...personalGys]

    const filas = matriz.filas.map(f => ({
      orden: f.orden,
      edtNombre: f.informacion,
      frecuencia: f.frecuencia,
      medio: f.medio,
      celdas: parseCeldas(f.receptores),
    }))

    const today = new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const codigoFallback = `MX-${proyecto.codigo || proyectoId.substring(0, 8)}-GYS-001`
    const codigo = matriz.codigoDocumento || codigoFallback

    let buffer: Buffer
    try {
      buffer = await renderMatrizPlantillaOficial({
        proyecto: {
          nombre: proyecto.nombre,
          clienteNombre: proyecto.cliente?.nombre ?? '',
          clienteLogoUrl: proyecto.cliente?.logoUrl ?? null,
          sede: proyecto.sede,
          etapa: proyecto.etapa,
          ordenCompraCliente: proyecto.ordenCompraCliente,
        },
        matriz: {
          codigoDocumento: matriz.codigoDocumento,
          revisionDocumento: matriz.revisionDocumento,
          numeroConsultor: matriz.numeroConsultor,
          desarrolloNombre: matriz.desarrolloNombre,
          verificoNombre: matriz.verificoNombre,
          aproboNombre: matriz.aproboNombre,
          autorizoNombre: matriz.autorizoNombre,
        },
        personal,
        filas,
      })
    } catch (e) {
      console.warn('[matriz-plantilla] Fallback al export genérico:', e instanceof Error ? e.message : e)
      buffer = await generarDocxMatriz({
        proyecto: proyecto.nombre,
        cliente: proyecto.cliente?.nombre ?? '',
        codigoDocumento: codigoFallback,
        revision: matriz.version,
        fecha: today,
        personal,
        filas,
      })
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${codigo}.docx"`,
      },
    })
  } catch (error) {
    console.error('GET /api/proyectos/[id]/matriz-comunicacion/docx:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
