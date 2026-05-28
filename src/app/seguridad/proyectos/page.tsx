import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { ProyectoEstado } from '@prisma/client'
import { ProyectosLista } from './ProyectosLista'

const ESTADOS_ACTIVOS: ProyectoEstado[] = [
  'creado',
  'en_planificacion',
  'listas_pendientes',
  'listas_aprobadas',
  'pedidos_creados',
  'en_ejecucion',
  'en_cierre',
]

export default async function SeguridadProyectosPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const proyectos = await prisma.proyecto.findMany({
    where: {
      estado: { in: ESTADOS_ACTIVOS },
      deletedAt: null,
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estado: true,
      fechaInicio: true,
      cliente: { select: { id: true, nombre: true } },
      gestor: { select: { id: true, name: true } },
    },
    orderBy: [{ estado: 'asc' }, { fechaInicio: 'desc' }],
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Proyectos — Seguridad</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''} activo
          {proyectos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {proyectos.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          No hay proyectos activos.
        </div>
      ) : (
        <ProyectosLista proyectos={proyectos} />
      )}
    </div>
  )
}
