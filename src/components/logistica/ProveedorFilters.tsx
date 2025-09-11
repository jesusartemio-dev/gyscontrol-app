'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  MapPin, 
  Phone, 
  Mail,
  Building2,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ Types for filter state
export interface ProveedorFilterState {
  busqueda: string;
  ruc: string;
  conDireccion: boolean;
  conTelefono: boolean;
  conCorreo: boolean;
}

// ✅ Props interface
interface ProveedorFiltersProps {
  filters: ProveedorFilterState;
  onFiltersChange: (filters: ProveedorFilterState) => void;
  totalProveedores: number;
  proveedoresFiltrados: number;
}

// 🎨 Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

/**
 * ProveedorFilters Component
 * 
 * Advanced filtering component for provider management with:
 * - Text search by name and RUC
 * - Contact information filters (address, phone, email)
 * - Active filter badges with clear functionality
 * - Real-time filter count display
 */
export default function ProveedorFilters({
  filters,
  onFiltersChange,
  totalProveedores,
  proveedoresFiltrados
}: ProveedorFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 📡 Handle filter changes
  const handleFilterChange = (key: keyof ProveedorFilterState, value: string | boolean) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  // 🔁 Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      busqueda: '',
      ruc: '',
      conDireccion: false,
      conTelefono: false,
      conCorreo: false
    });
    setShowAdvanced(false);
  };

  // 📊 Count active filters
  const activeFiltersCount = [
    filters.busqueda,
    filters.ruc,
    filters.conDireccion,
    filters.conTelefono,
    filters.conCorreo
  ].filter(Boolean).length;

  // 🏷️ Get active filter badges
  const getActiveFilterBadges = () => {
    const badges = [];
    
    if (filters.busqueda) {
      badges.push({
        key: 'busqueda',
        label: `Búsqueda: "${filters.busqueda}"`,
        icon: Search
      });
    }
    
    if (filters.ruc) {
      badges.push({
        key: 'ruc',
        label: `RUC: "${filters.ruc}"`,
        icon: Hash
      });
    }
    
    if (filters.conDireccion) {
      badges.push({
        key: 'conDireccion',
        label: 'Con dirección',
        icon: MapPin
      });
    }
    
    if (filters.conTelefono) {
      badges.push({
        key: 'conTelefono',
        label: 'Con teléfono',
        icon: Phone
      });
    }
    
    if (filters.conCorreo) {
      badges.push({
        key: 'conCorreo',
        label: 'Con correo',
        icon: Mail
      });
    }
    
    return badges;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <Card>
        <CardContent className="p-4">
          {/* Main Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.div variants={itemVariants} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre de proveedor..."
                  value={filters.busqueda}
                  onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                  className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="flex gap-2">
              <Button
                variant={showAdvanced ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </motion.div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* RUC Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      RUC
                    </label>
                    <Input
                      placeholder="Buscar por RUC..."
                      value={filters.ruc}
                      onChange={(e) => handleFilterChange('ruc', e.target.value)}
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Contact Filters */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                      Información de Contacto
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.conDireccion}
                          onChange={(e) => handleFilterChange('conDireccion', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span>Con dirección</span>
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.conTelefono}
                          onChange={(e) => handleFilterChange('conTelefono', e.target.checked)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <Phone className="h-4 w-4 text-green-600" />
                        <span>Con teléfono</span>
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.conCorreo}
                          onChange={(e) => handleFilterChange('conCorreo', e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Mail className="h-4 w-4 text-purple-600" />
                        <span>Con correo</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filters Display */}
          <AnimatePresence>
            {activeFiltersCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Filtros activos:</span>
                  {getActiveFilterBadges().map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <Badge
                        key={badge.key}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-2.5 py-1"
                      >
                        <Icon className="h-3 w-3" />
                        {badge.label}
                        <button
                          onClick={() => {
                            if (badge.key === 'busqueda') handleFilterChange('busqueda', '');
                            else if (badge.key === 'ruc') handleFilterChange('ruc', '');
                            else handleFilterChange(badge.key as keyof ProveedorFilterState, false);
                          }}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>
                  Mostrando <span className="font-semibold text-blue-600">{proveedoresFiltrados}</span> de{' '}
                  <span className="font-semibold">{totalProveedores}</span> proveedores
                </span>
              </div>
              
              {proveedoresFiltrados !== totalProveedores && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {Math.round((proveedoresFiltrados / totalProveedores) * 100)}% filtrado
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
