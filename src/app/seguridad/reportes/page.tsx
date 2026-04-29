'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, Calendar, Users, Building2 } from 'lucide-react'
import Link from 'next/link'

const REPORTES = [
  {
    href: '/seguridad/reportes/consumo-mensual',
    label: 'Consumo mensual',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-50',
    desc: 'Cantidad y costo de EPPs entregados por mes, con desglose por subcategoría',
  },
  {
    href: '/seguridad/reportes/por-empleado',
    label: 'Por empleado (auditoría)',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50',
    desc: 'EPPs entregados por trabajador. Útil para auditorías laborales SST',
  },
  {
    href: '/seguridad/reportes/por-imputacion',
    label: 'Por proyecto / centro de costo',
    icon: Building2,
    color: 'text-orange-600 bg-orange-50',
    desc: 'Costo de EPPs agrupado por imputación de las entregas',
  },
]

export default function ReportesIndexPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" /> Reportes EPP
          </h1>
          <p className="text-sm text-muted-foreground">Consumos, costos y auditorías</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTES.map(({ href, label, icon: Icon, color, desc }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer hover:shadow-md transition h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <span className={`h-9 w-9 rounded-md ${color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
