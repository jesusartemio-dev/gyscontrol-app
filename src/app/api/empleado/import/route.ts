import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface EmpleadoImportado {
  email: string
  cargo?: string
  departamento?: string
  sueldoPlanilla?: number
  sueldoHonorarios?: number
  asignacionFamiliar?: number
  emo?: number
  fechaIngreso?: string
  documentoIdentidad?: string
  telefono?: string
  direccion?: string
  observaciones?: string
  activo: boolean
}

export async function POST(request: Request) {
  try {
    const { empleados } = await request.json() as { empleados: EmpleadoImportado[] }

    if (!Array.isArray(empleados) || empleados.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron empleados para importar' },
        { status: 400 }
      )
    }

    // Obtener todos los cargos y departamentos para buscar por nombre
    const [cargos, departamentos] = await Promise.all([
      prisma.cargo.findMany({ where: { activo: true } }),
      prisma.departamento.findMany({ where: { activo: true } })
    ])

    const resultados = {
      creados: 0,
      actualizados: 0,
      errores: [] as string[]
    }

    for (const emp of empleados) {
      try {
        // Validar email requerido
        if (!emp.email || emp.email.trim() === '') {
          resultados.errores.push('Empleado sin email')
          continue
        }

        // Buscar usuario por email
        const usuario = await prisma.user.findUnique({
          where: { email: emp.email.toLowerCase().trim() }
        })

        if (!usuario) {
          resultados.errores.push(`Usuario no encontrado: ${emp.email}`)
          continue
        }

        // Buscar cargo por nombre (case insensitive)
        let cargoId: string | null = null
        if (emp.cargo) {
          const cargo = cargos.find(c =>
            c.nombre.toLowerCase() === emp.cargo!.toLowerCase()
          )
          if (cargo) {
            cargoId = cargo.id
          } else {
            resultados.errores.push(`Cargo no encontrado para ${emp.email}: ${emp.cargo}`)
          }
        }

        // Buscar departamento por nombre (case insensitive)
        let departamentoId: string | null = null
        if (emp.departamento) {
          const depto = departamentos.find(d =>
            d.nombre.toLowerCase() === emp.departamento!.toLowerCase()
          )
          if (depto) {
            departamentoId = depto.id
          } else {
            resultados.errores.push(`Departamento no encontrado para ${emp.email}: ${emp.departamento}`)
          }
        }

        // Verificar si ya existe como empleado
        const empleadoExiste = await prisma.empleado.findUnique({
          where: { userId: usuario.id }
        })

        const dataEmpleado = {
          cargoId,
          departamentoId,
          sueldoPlanilla: emp.sueldoPlanilla || null,
          sueldoHonorarios: emp.sueldoHonorarios || null,
          asignacionFamiliar: emp.asignacionFamiliar ?? 0,
          emo: emp.emo ?? 25,
          fechaIngreso: emp.fechaIngreso ? new Date(emp.fechaIngreso) : null,
          documentoIdentidad: emp.documentoIdentidad?.trim() || null,
          telefono: emp.telefono?.trim() || null,
          direccion: emp.direccion?.trim() || null,
          observaciones: emp.observaciones?.trim() || null,
          activo: emp.activo ?? true
        }

        if (empleadoExiste) {
          // Actualizar empleado existente
          await prisma.empleado.update({
            where: { id: empleadoExiste.id },
            data: dataEmpleado
          })
          resultados.actualizados++
        } else {
          // Crear nuevo empleado
          await prisma.empleado.create({
            data: {
              userId: usuario.id,
              ...dataEmpleado
            }
          })
          resultados.creados++
        }
      } catch (error) {
        console.error(`Error al procesar empleado ${emp.email}:`, error)
        resultados.errores.push(`Error al procesar empleado: ${emp.email}`)
      }
    }

    const mensaje = [
      resultados.creados > 0 ? `${resultados.creados} creados` : null,
      resultados.actualizados > 0 ? `${resultados.actualizados} actualizados` : null
    ].filter(Boolean).join(', ')

    return NextResponse.json({
      message: `Importación completada: ${mensaje || 'sin cambios'}`,
      creados: resultados.creados,
      actualizados: resultados.actualizados,
      total: empleados.length,
      errores: resultados.errores.length > 0 ? resultados.errores : undefined
    })
  } catch (error) {
    console.error('❌ Error en POST /empleado/import:', error)
    return NextResponse.json(
      { error: 'Error al procesar la importación' },
      { status: 500 }
    )
  }
}
