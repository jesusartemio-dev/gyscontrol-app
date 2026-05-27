import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Calendar, User } from 'lucide-react'
import type { ProyectoEstado } from '@prisma/client'

const ESTADOS_ACTIVOS: ProyectoEstado[] = [
  'creado',
  'en_planificacion',
  'listas_pendientes',
  'listas_aprobadas',
  'pedidos_creados',
  'en_ejecucion',
  'en_cierre',
]

const ESTADO_LABELS: Partial<Record<ProyectoEstado, string>> = {
  creado: 'Creado',
  en_planificacion: 'En planificación',
  listas_pendientes: 'Listas pendientes',
  listas_aprobadas: 'Listas aprobadas',
  pedidos_creados: 'Pedidos creados',
  en_ejecucion: 'En ejecución',
  en_cierre: 'En cierre',
}

const ESTADO_COLOR: Partial<Record<ProyectoEstado, string>> = {
  creado: 'bg-gray-100 text-gray-700 border-gray-200',
  en_planificacion: 'bg-blue-100 text-blue-700 border-blue-200',
  listas_pendientes: 'bg-amber-100 text-amber-700 border-amber-200',
  listas_aprobadas: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pedidos_creados: 'bg-orange-100 text-orange-700 border-orange-200',
  en_ejecucion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  en_cierre: 'bg-purple-100 text-purple-700 border-purple-200',
}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {proyectos.map((p) => (
            <Link key={p.id} href={`/seguridad/proyectos/${p.id}/informe-mensual`}>
              <Card className="hover:shadow-md transition cursor-pointer h-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{p.codigo}</p>
                      <p className="font-semibold text-sm leading-tight mt-0.5">{p.nombre}</p>
                    </div>
                    <Badge
                      className={`text-[10px] border shrink-0 ${ESTADO_COLOR[p.estado] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      {ESTADO_LABELS[p.estado] ?? p.estado}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {p.cliente && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.cliente.nombre}</span>
                      </div>
                    )}
                    {p.gestor?.name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span>{p.gestor.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>
                        Inicio:{' '}
                        {p.fechaInicio.toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
