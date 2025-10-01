// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/audit/
// 🔧 Descripción: API para consultar historial de auditoría
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ✅ GET /api/audit - Obtener historial de auditoría con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entidadTipo = searchParams.get('entidadTipo');
    const entidadId = searchParams.get('entidadId');
    const usuarioId = searchParams.get('usuarioId');
    const accion = searchParams.get('accion');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Construir filtros
    const where: any = {};

    if (entidadTipo) where.entidadTipo = entidadTipo;
    if (entidadId) where.entidadId = entidadId;
    if (usuarioId) where.usuarioId = usuarioId;
    if (accion) where.accion = accion;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.min(limit, 100) // Máximo 100 registros
    });

    // Transformar fechas para compatibilidad con frontend
    const transformedLogs = auditLogs.map((log: any) => ({
      ...log,
      createdAt: log.createdAt.toISOString()
    }));

    return NextResponse.json(transformedLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
