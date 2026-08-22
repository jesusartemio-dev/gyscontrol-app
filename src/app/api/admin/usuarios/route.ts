import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { ALL_ROLES } from '@/lib/config/sections'

/**
 * Deja `rolesExtra` en una lista limpia: solo roles válidos, sin duplicados y
 * sin repetir el rol principal (que ya cuenta por sí solo). Si no viene el
 * campo devuelve undefined para no pisar lo que haya en BD.
 */
function normalizarRolesExtra(valor: unknown, rolPrincipal: string): string[] | undefined {
  if (valor === undefined || valor === null) return undefined
  if (!Array.isArray(valor)) return []
  const validos = valor.filter(
    (r): r is string => typeof r === 'string' && (ALL_ROLES as readonly string[]).includes(r),
  )
  return Array.from(new Set(validos)).filter((r) => r !== rolPrincipal)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, password, role } = body
    const rolesExtra = normalizarRolesExtra(body.rolesExtra, role)

    // Validaciones básicas
    if (!email || !name || !role) {
      return NextResponse.json({ message: 'Faltan campos' }, { status: 400 })
    }

    // Verificar si ya existe
    const exist = await prisma.user.findUnique({ where: { email } })
    if (exist) {
      return NextResponse.json({ message: 'El correo ya existe' }, { status: 409 })
    }

    // Encriptar contraseña (opcional: usuarios OAuth no necesitan password)
    const hashedPassword = password ? await hash(password, 10) : null

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        name,
        password: hashedPassword,
        role,
        rolesExtra: (rolesExtra ?? []) as any,
      }
    })

    return NextResponse.json(newUser)
  } catch (error) {
    console.error('[ERROR crear usuario]', error)
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        rolesExtra: true,
        password: true,
        Account: {
          select: { provider: true },
        },
      },
      orderBy: { name: 'asc' }
    })

    // Map to include auth method info without exposing password
    const mapped = users.map(({ password, Account, ...user }) => ({
      ...user,
      hasPassword: !!password,
      authProviders: Account.map(a => a.provider),
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ message: 'ID requerido' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: 'Usuario eliminado' })
  } catch (error) {
    return NextResponse.json({ message: 'Error al eliminar usuario' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, email, role, password } = body
    const rolesExtra = normalizarRolesExtra(body.rolesExtra, role)

    if (!id || !name || !email || !role) {
      return NextResponse.json({ message: 'Campos incompletos' }, { status: 400 })
    }

    const dataToUpdate: any = { name, email, role }
    if (rolesExtra !== undefined) dataToUpdate.rolesExtra = rolesExtra

    if (password && password.length >= 4) {
      const hashedPassword = await hash(password, 10)
      dataToUpdate.password = hashedPassword
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ message: 'Error al actualizar' }, { status: 500 })
  }
}

// Force redeploy 1770147216
