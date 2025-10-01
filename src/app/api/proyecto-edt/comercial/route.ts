import { NextRequest, NextResponse } from 'next/server';
import { ProyectoEdtService } from '@/lib/services/proyectoEdt';

// GET /api/proyecto-edt/comercial?proyectoId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get('proyectoId');

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId es requerido' }, { status: 400 });
    }

    const edts = await ProyectoEdtService.obtenerEdtsComercialesDeProyecto(proyectoId);
    return NextResponse.json(edts);
  } catch (error) {
    console.error('Error en GET /api/proyecto-edt/comercial:', error);
    return NextResponse.json(
      { error: 'Error al obtener EDTs comerciales del proyecto' },
      { status: 500 }
    );
  }
}
