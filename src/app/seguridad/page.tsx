'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Warehouse, ClipboardList, Users, HardHat } from 'lucide-react'
import Link from 'next/link'

const TILES = [
  { href: '/seguridad/catalogo', label: 'Catálogo EPP', icon: Package, color: 'text-blue-600 bg-blue-50', desc: 'Crea y administra los EPPs disponibles' },
  { href: '/seguridad/stock', label: 'Stock EPP', icon: Warehouse, color: 'text-emerald-600 bg-emerald-50', desc: 'Cuántos EPPs hay disponibles por almacén' },
  { href: '/seguridad/entregas', label: 'Entregas', icon: ClipboardList, color: 'text-orange-600 bg-orange-50', desc: 'Registrar y consultar entregas a empleados' },
  { href: '/seguridad/empleados', label: 'Empleados', icon: Users, color: 'text-violet-600 bg-violet-50', desc: 'Tallas y EPPs asignados por empleado' },
]

export default function SeguridadDashboardPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
          <HardHat className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Seguridad — Gestión de EPPs</h1>
          <p className="text-sm text-muted-foreground">Catálogo, stock, entregas y empleados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TILES.map(({ href, label, icon: Icon, color, desc }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer hover:shadow-md transition">
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
