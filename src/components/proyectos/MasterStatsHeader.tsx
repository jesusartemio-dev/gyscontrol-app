'use client';

/**
 * 📊 MasterStatsHeader Component
 * 
 * Componente compacto que consolida las estadísticas principales de listas de equipos,
 * eliminando duplicaciones entre page.tsx y ListaEquipoMasterView.tsx
 * 
 * Features:
 * ✅ Estadísticas consolidadas en un solo lugar
 * ✅ Diseño compacto y responsive
 * ✅ Animaciones y efectos visuales modernos
 * ✅ Soporte para modo oscuro
 * ✅ Indicadores de progreso dinámicos
 */

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  List,
  Package,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// 📊 Types
interface MasterStats {
  totalListas: number;
  totalItems: number;
  totalCosto: number;
  progresoPromedio: number;
  listasPorEstado?: {
    aprobado?: number;
    pendiente?: number;
    revision?: number;
    rechazado?: number;
  };
}

interface MasterStatsHeaderProps {
  stats: MasterStats;
  loading?: boolean;
  compact?: boolean;
  showProgress?: boolean;
  className?: string;
}

// 🎨 Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20
    }
  }
};

// 🎯 Main Component
export function MasterStatsHeader({
  stats,
  loading = false,
  compact = false,
  showProgress = true,
  className = ''
}: MasterStatsHeaderProps) {
  
  // 📊 Calculate derived metrics
  const completionRate = stats.totalListas > 0 
    ? Math.round((stats.listasPorEstado?.aprobado || 0) / stats.totalListas * 100)
    : 0;
    
  const avgItemsPerList = stats.totalListas > 0 
    ? Math.round(stats.totalItems / stats.totalListas)
    : 0;
    
  const avgCostPerItem = stats.totalItems > 0 
    ? stats.totalCosto / stats.totalItems
    : 0;

  // 🎨 Stat cards configuration
  const statCards = [
    {
      id: 'listas',
      label: 'Total Listas',
      value: stats.totalListas,
      icon: List,
      color: 'blue',
      gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
      iconBg: 'bg-blue-600',
      textColor: 'text-blue-800 dark:text-blue-200',
      labelColor: 'text-blue-600 dark:text-blue-400',
      subtitle: `${avgItemsPerList} items/lista promedio`
    },
    {
      id: 'items',
      label: 'Total Items',
      value: stats.totalItems,
      icon: Package,
      color: 'indigo',
      gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900',
      iconBg: 'bg-indigo-600',
      textColor: 'text-indigo-800 dark:text-indigo-200',
      labelColor: 'text-indigo-600 dark:text-indigo-400',
      subtitle: 'equipos registrados'
    },
    {
      id: 'costo',
      label: 'Costo Total',
      value: formatCurrency(stats.totalCosto, 'USD'),
      icon: DollarSign,
      color: 'emerald',
      gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900',
      iconBg: 'bg-emerald-600',
      textColor: 'text-emerald-800 dark:text-emerald-200',
      labelColor: 'text-emerald-600 dark:text-emerald-400',
      subtitle: `${formatCurrency(avgCostPerItem, 'USD')}/item promedio`
    },
    {
      id: 'progreso',
      label: 'Progreso',
      value: `${Math.round(stats.progresoPromedio)}%`,
      icon: BarChart3,
      color: 'green',
      gradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
      iconBg: 'bg-green-600',
      textColor: 'text-green-800 dark:text-green-200',
      labelColor: 'text-green-600 dark:text-green-400',
      subtitle: `${completionRate}% completado`
    }
  ];

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`space-y-4 ${className}`}
    >
      {/* 📊 Main Stats Grid */}
      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-4'} gap-4`}>
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          
          return (
            <motion.div
              key={stat.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className={`overflow-hidden border-0 shadow-lg bg-gradient-to-br ${stat.gradient} hover:shadow-xl transition-all duration-300`}>
                <CardContent className={compact ? "p-4" : "p-6"}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <p className={`text-sm font-medium ${stat.labelColor}`}>
                        {stat.label}
                      </p>
                      <motion.p 
                        className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold ${stat.textColor}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      >
                        {stat.value}
                      </motion.p>
                      {!compact && (
                        <p className="text-xs text-muted-foreground">
                          {stat.subtitle}
                        </p>
                      )}
                    </div>
                    <div className={`p-3 ${stat.iconBg} rounded-full`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

    </motion.div>
  );
}

export default MasterStatsHeader;
