// ===================================================
// 📅 UTILIDADES PARA SISTEMA DE CALENDARIOS LABORALES (SERVER-ONLY)
// ===================================================

import "server-only";
import { prisma } from '@/lib/prisma'

/**
 * Obtiene el calendario laboral activo para una entidad
 */
export async function obtenerCalendarioLaboral(entidadTipo: string, entidadId: string): Promise<any | null> {
  try {
    // Buscar calendario usando Prisma
    const calendario = await prisma.calendarioLaboral.findFirst({
      where: {
        activo: true
      },
      include: {
        dia_calendario: true,
        excepcion_calendario: true
      }
    })

    return calendario
  } catch (error) {
    console.error('Error obteniendo calendario laboral:', error)
    return null
  }
}

/**
 * Obtiene un calendario laboral específico por ID
 */
export async function obtenerCalendarioLaboralPorId(calendarioId: string): Promise<any | null> {
  try {
    const calendario = await prisma.calendarioLaboral.findUnique({
      where: { id: calendarioId },
      include: {
        dia_calendario: true,
        excepcion_calendario: true,
        configuracion_calendario: true
      }
    })

    return calendario
  } catch (error) {
    console.error('Error obteniendo calendario laboral por ID:', error)
    return null
  }
}

/**
 * Crea calendario laboral por defecto para Colombia
 */
export async function crearCalendarioColombia(): Promise<any> {
  try {
    const calendario = await prisma.calendarioLaboral.create({
      data: {
        nombre: 'Colombia - Estándar',
        descripcion: 'Calendario laboral estándar para Colombia',
        pais: 'Colombia',
        empresa: 'GYS',
        activo: true,
        horasPorDia: 8.0,
        diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
        horaInicioManana: '08:00',
        horaFinManana: '12:00',
        horaInicioTarde: '13:00',
        horaFinTarde: '17:00'
      } as any,
      include: {
        dia_calendario: true
      }
    })

    return calendario
  } catch (error) {
    console.error('Error creando calendario Colombia:', error)
    return null
  }
}