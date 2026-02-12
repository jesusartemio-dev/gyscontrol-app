import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Home, ChevronRight, Loader2 } from 'lucide-react'
import { KpiDashboard } from './KpiDashboard'

export const metadata = {
  title: 'KPIs de Gestión | GYS',
  description: 'Dashboard ejecutivo con indicadores clave de rendimiento',
}

export const dynamic = 'force-dynamic'

export default async function GestionPage() {
  const session = await getServerSession(authOptions)
  if (!session) notFound()

  const allowedRoles = ['admin', 'gerente', 'gestor', 'comercial', 'proyectos', 'logistico', 'coordinador']
  const userRole = (session.user?.role as string) || ''

  if (!allowedRoles.includes(userRole)) notFound()

  return (
    <div className="p-4 space-y-3">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">KPIs de Gestión</span>
      </nav>

      <Suspense fallback={
        <div className="flex items-center justify-center h-[calc(100vh-150px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <KpiDashboard userRole={userRole} />
      </Suspense>
    </div>
  )
}
