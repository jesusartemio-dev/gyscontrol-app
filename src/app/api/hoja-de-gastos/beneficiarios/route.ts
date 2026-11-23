/**
 * Las personas a las que se le puede pedir un depósito.
 *
 * Existe aparte de /api/admin/usuarios porque esa ruta devuelve el rol, los
 * roles extra, si tiene contraseña y con qué proveedores entra — nada de eso
 * hace falta para elegir a quién depositarle, y no corresponde exponerlo a
 * quien solo está llenando un requerimiento.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tieneRol, ROLES_PAGO_A_OTROS } from '@/lib/auth/roles'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    // Mismo permiso que hace falta para crear la hoja a nombre de otro: si no
    // lo tiene, la lista no le sirve para nada.
    if (!tieneRol(session, ROLES_PAGO_A_OTROS)) {
      return NextResponse.json({ error: 'Sin permiso para ver beneficiarios' }, { status: 403 })
    }

    const personas = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(personas)
  } catch (error) {
    console.error('Error al listar beneficiarios:', error)
    return NextResponse.json({ error: 'Error al listar beneficiarios' }, { status: 500 })
  }
}
