import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProyectoEdtService } from '@/lib/services/proyectoEdt';
import type { FiltrosCronogramaData } from '@/types/modelos';

// GET /api/proyecto-edt?proyectoId=...&edtId=...&estado=...
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get('proyectoId');

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 });
    }

    // Parse filters from query params
    const filtros: FiltrosCronogramaData = {
      edtId: searchParams.get('edtId') || undefined,
      estado: searchParams.get('estado') as any || undefined,
      responsableId: searchParams.get('responsableId') || undefined,
      fechaDesde: searchParams.get('fechaDesde') ? new Date(searchParams.get('fechaDesde')!) : undefined,
      fechaHasta: searchParams.get('fechaHasta') ? new Date(searchParams.get('fechaHasta')!) : undefined,
    };

    const edts = await ProyectoEdtService.obtenerEdtsPorProyecto(proyectoId, filtros);
    return NextResponse.json(edts);
  } catch (error) {
    console.error('Error en GET /api/proyecto-edt:', error);
    return NextResponse.json(
      { error: 'Error al obtener EDTs del proyecto' },
      { status: 500 }
    );
  }
}

// POST /api/proyecto-edt
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const edt = await ProyectoEdtService.crearEdt(body);
    return NextResponse.json(edt, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/proyecto-edt:', error);
    return NextResponse.json(
      { error: 'Error al crear EDT' },
      { status: 500 }
    );
  }
}
