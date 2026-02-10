import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProyectoEdtService } from '@/lib/services/proyectoEdt';

// GET /api/proyecto-edt/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const edt = await ProyectoEdtService.obtenerEdtPorId(id);

    if (!edt) {
      return NextResponse.json({ error: 'EDT no encontrado' }, { status: 404 });
    }

    return NextResponse.json(edt);
  } catch (error) {
    console.error('Error en GET /api/proyecto-edt/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener EDT' },
      { status: 500 }
    );
  }
}

// PUT /api/proyecto-edt/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const edt = await ProyectoEdtService.actualizarEdt(id, body);
    return NextResponse.json(edt);
  } catch (error) {
    console.error('Error en PUT /api/proyecto-edt/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar EDT' },
      { status: 500 }
    );
  }
}

// DELETE /api/proyecto-edt/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    await ProyectoEdtService.eliminarEdt(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/proyecto-edt/[id]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar EDT' },
      { status: 500 }
    );
  }
}