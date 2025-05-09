import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, password, role } = body

    // Validaciones básicas
    if (!email || !password || !name || !role) {
      return NextResponse.json({ message: 'Faltan campos' }, { status: 400 })
    }

    // Verificar si ya existe
    const exist = await prisma.user.findUnique({ where: { email } })
    if (exist) {
      return NextResponse.json({ message: 'El correo ya existe' }, { status: 409 })
    }

    // Encriptar contraseña
    const hashedPassword = await hash(password, 10)

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role
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
        role: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(users)
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

    if (!id || !name || !email || !role) {
      return NextResponse.json({ message: 'Campos incompletos' }, { status: 400 })
    }

    const dataToUpdate: any = { name, email, role }

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

