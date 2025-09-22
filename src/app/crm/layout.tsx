'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Target, Users, TrendingUp, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CrmLayoutProps {
  children: ReactNode
}

export default function CrmLayout({ children }: CrmLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header del módulo CRM */}
      <motion.div
        className="border-b bg-card"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Sistema CRM</h1>
                <p className="text-sm text-muted-foreground">
                  Gestión de Relaciones con Clientes
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">Estado del Sistema</p>
                <p className="text-xs text-muted-foreground">Operativo</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Contenido principal */}
      <main className="container mx-auto">
        {children}
      </main>

      {/* Footer del módulo CRM */}
      <motion.footer
        className="border-t bg-card mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Sistema GYS - Módulo CRM</span>
              <span>•</span>
              <span>v1.0.0-beta</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Documentación</span>
              <span>•</span>
              <span>Soporte</span>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}