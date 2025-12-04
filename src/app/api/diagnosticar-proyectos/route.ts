// API temporal para diagnosticar problemas con proyectos (SIN AUTENTICACIÓN)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DIAGNÓSTICO: Iniciando diagnóstico sin auth...');
    
    // 1. Contar todos los proyectos en DB
    const totalProyectosDB = await prisma.proyecto.count();
    console.log('🔍 DIAGNÓSTICO: Total proyectos en DB:', totalProyectosDB);
    
    // 2. Obtener algunos proyectos de ejemplo sin filtros
    const proyectosEjemplo = await prisma.proyecto.findMany({
      take: 3,
      include: {
        comercial: { select: { id: true, name: true } },
        gestor: { select: { id: true, name: true } }
      }
    });
    console.log('🔍 DIAGNÓSTICO: Proyectos de ejemplo:', proyectosEjemplo.length);
    
    // 3. Ver si hay usuarios con rol admin
    const usuariosAdmin = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, name: true, email: true, role: true }
    });
    console.log('🔍 DIAGNÓSTICO: Usuarios admin:', usuariosAdmin.length);
    
    // 4. Ver si hay clientes (necesarios para proyectos)
    const totalClientes = await prisma.cliente.count();
    console.log('🔍 DIAGNÓSTICO: Total clientes:', totalClientes);
    
    return NextResponse.json({
      success: true,
      mensaje: "Diagnóstico sin autenticación",
      diagnostico: {
        timestamp: new Date().toISOString(),
        totalProyectosDB,
        totalClientes,
        totalUsuariosAdmin: usuariosAdmin.length,
        proyectosEjemplo: proyectosEjemplo.map(p => ({
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
          estado: p.estado,
          comercial: p.comercial?.name,
          gestor: p.gestor?.name,
          createdAt: p.createdAt
        })),
        usuariosAdmin: usuariosAdmin.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ DIAGNÓSTICO Error:', error);
    return NextResponse.json(
      { 
        error: 'Error en diagnóstico',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}