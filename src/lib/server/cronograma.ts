import "server-only";
import { prisma } from '@/lib/prisma';
import type { Proyecto } from '@/types/modelos';

export async function getProyectoForCronograma(id: string): Promise<Proyecto | null> {
  try {
    return await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true, estado: true, fechaFin: true, totalReal: true, totalInterno: true }
    }) as Proyecto | null;
  } catch (error) {
    console.error('Error al obtener proyecto para cronograma:', error);
    return null;
  }
}