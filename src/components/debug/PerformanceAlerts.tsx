// ===================================================
// 🚨 Componente de Alertas de Performance - Sistema GYS
// ===================================================
// UI para mostrar alertas de performance en tiempo real
// Panel interactivo con filtros, estadísticas y controles

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle,
  Filter,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Zap,
  Wifi,
  Monitor,
  RotateCcw,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { useSystemPerformanceAlerts } from '@/lib/hooks/usePerformanceAlerts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 📊 Interfaces para el componente
interface AlertFilters {
  type: 'all' | 'warning' | 'error' | 'critical';
  category: 'all' | 'render' | 'memory' | 'network' | 'fps' | 'rerender';
  status: 'all' | 'active' | 'resolved';
  component: string;
}

interface PerformanceAlertsProps {
  className?: string;
  showSystemHealth?: boolean;
  showFilters?: boolean;
  showControls?: boolean;
  maxHeight?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// 🎨 Configuración de iconos y colores por tipo
const ALERT_CONFIG = {
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeVariant: 'secondary' as const,
  },
  error: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeVariant: 'destructive' as const,
  },
  critical: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeVariant: 'destructive' as const,
  },
};

// 🎯 Configuración de iconos por categoría
const CATEGORY_ICONS = {
  render: Clock,
  memory: Activity,
  network: Wifi,
  fps: Monitor,
  rerender: RotateCcw,
};

// 🧪 Componente principal
export const PerformanceAlerts: React.FC<PerformanceAlertsProps> = ({
  className = '',
  showSystemHealth = true,
  showFilters = true,
  showControls = true,
  maxHeight = '600px',
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  // 🚨 Hook de alertas
  const {
    alerts,
    activeAlerts,
    hasActiveAlerts,
    resolveAlert,
    clearAlerts,
    toggleAlerts,
    getAlertStats,
    getSystemHealth,
    currentMetrics,
  } = useSystemPerformanceAlerts();

  // 🎛️ Estado local
  const [filters, setFilters] = useState<AlertFilters>({
    type: 'all',
    category: 'all',
    status: 'all',
    component: 'all',
  });
  const [isEnabled, setIsEnabled] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  // 📊 Datos computados
  const alertStats = useMemo(() => getAlertStats(), [getAlertStats]);
  const systemHealth = useMemo(() => getSystemHealth(), [getSystemHealth]);
  
  // 🔍 Alertas filtradas
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // 🎯 Filtro por tipo
      if (filters.type !== 'all' && alert.type !== filters.type) return false;
      
      // 📂 Filtro por categoría
      if (filters.category !== 'all' && alert.category !== filters.category) return false;
      
      // ✅ Filtro por estado
      if (filters.status === 'active' && alert.resolved) return false;
      if (filters.status === 'resolved' && !alert.resolved) return false;
      
      // 🧩 Filtro por componente
      if (filters.component !== 'all' && alert.component !== filters.component) return false;
      
      // 👁️ Mostrar resueltas
      if (!showResolved && alert.resolved) return false;
      
      return true;
    });
  }, [alerts, filters, showResolved]);

  // 🧩 Lista de componentes únicos
  const uniqueComponents = useMemo(() => {
    const components = new Set(
      alerts
        .map(alert => alert.component)
        .filter((component): component is string => Boolean(component))
    );
    return Array.from(components);
  }, [alerts]);

  // 🎛️ Handlers
  const handleToggleAlerts = (enabled: boolean) => {
    setIsEnabled(enabled);
    toggleAlerts(enabled);
  };

  const handleResolveAlert = (alertId: string) => {
    resolveAlert(alertId);
  };

  const handleClearAll = () => {
    clearAlerts();
  };

  const handleFilterChange = (key: keyof AlertFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 🎨 Función para renderizar alerta individual
  const renderAlert = (alert: any) => {
    const config = ALERT_CONFIG[alert.type as keyof typeof ALERT_CONFIG];
    const CategoryIcon = CATEGORY_ICONS[alert.category as keyof typeof CATEGORY_ICONS];
    const AlertIcon = config.icon;
    const isSelected = selectedAlert === alert.id;

    return (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          border rounded-lg p-4 cursor-pointer transition-all duration-200
          ${config.borderColor} ${config.bgColor}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${alert.resolved ? 'opacity-60' : ''}
          hover:shadow-md
        `}
        onClick={() => setSelectedAlert(isSelected ? null : alert.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* 🎯 Icono de tipo */}
            <div className={`flex-shrink-0 ${config.color}`}>
              <AlertIcon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* 📝 Mensaje principal */}
              <div className="flex items-center space-x-2 mb-2">
                <p className={`font-medium ${config.color} truncate`}>
                  {alert.message}
                </p>
                {alert.resolved && (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </div>
              
              {/* 🏷️ Badges */}
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant={config.badgeVariant} className="text-xs">
                  {alert.type.toUpperCase()}
                </Badge>
                
                <Badge variant="outline" className="text-xs flex items-center space-x-1">
                  <CategoryIcon className="w-3 h-3" />
                  <span>{alert.category}</span>
                </Badge>
                
                {alert.component && (
                  <Badge variant="outline" className="text-xs">
                    {alert.component}
                  </Badge>
                )}
              </div>
              
              {/* ⏰ Timestamp */}
              <p className="text-xs text-gray-500">
                {new Date(alert.timestamp).toLocaleTimeString()}
                {alert.duration && (
                  <span className="ml-2">
                    (resolved in {(alert.duration / 1000).toFixed(1)}s)
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* 🎛️ Controles */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {!alert.resolved && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResolveAlert(alert.id);
                }}
                className="h-8 w-8 p-0"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* 📊 Detalles expandidos */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              <div className="space-y-2">
                {Object.entries(alert.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                    </span>
                    <span className="text-gray-800">
                      {typeof value === 'number' ? value.toFixed(2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 🏥 System Health */}
      {showSystemHealth && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>System Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 📊 Health Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Health Score</span>
                  <span className={`text-sm font-bold ${
                    systemHealth.status === 'excellent' ? 'text-green-600' :
                    systemHealth.status === 'good' ? 'text-blue-600' :
                    systemHealth.status === 'fair' ? 'text-yellow-600' :
                    systemHealth.status === 'poor' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {systemHealth.score}/100
                  </span>
                </div>
                <Progress 
                  value={systemHealth.score} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500 capitalize">
                  {systemHealth.status}
                </p>
              </div>
              
              {/* 🚨 Active Issues */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Active Issues</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">{systemHealth.criticalIssues}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">{systemHealth.totalIssues}</span>
                  </div>
                </div>
              </div>
              
              {/* 📈 Current Metrics */}
              {currentMetrics && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Current Metrics</span>
                  <div className="text-xs space-y-1">
                    <div>Render: {currentMetrics.renderTime.toFixed(1)}ms</div>
                    <div>Memory: {currentMetrics.memoryUsage.toFixed(1)}MB</div>
                    <div>FPS: {currentMetrics.fps.toFixed(0)}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🎛️ Controls */}
      {showControls && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Alert Controls</span>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggleAlerts}
                />
                <span className="text-sm">
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearAll}
                  disabled={alerts.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showResolved}
                    onCheckedChange={setShowResolved}
                  />
                  <span className="text-sm">Show Resolved</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <BarChart3 className="w-4 h-4" />
                <span>{filteredAlerts.length} alerts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🔍 Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 🎯 Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 📂 Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => handleFilterChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="render">Render</SelectItem>
                    <SelectItem value="memory">Memory</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="fps">FPS</SelectItem>
                    <SelectItem value="rerender">Re-render</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* ✅ Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 🧩 Component Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Component</label>
                <Select
                  value={filters.component}
                  onValueChange={(value) => handleFilterChange('component', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Components</SelectItem>
                    {uniqueComponents.map(component => (
                      <SelectItem key={component} value={component}>
                        {component}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 📊 Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Alert Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{alertStats.total}</div>
              <div className="text-sm text-gray-600">Total Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{alertStats.resolved}</div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {alertStats.byType.critical || 0}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {alertStats.avgResolutionTime > 0 
                  ? `${(alertStats.avgResolutionTime / 1000).toFixed(1)}s`
                  : 'N/A'
                }
              </div>
              <div className="text-sm text-gray-600">Avg Resolution</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🚨 Alerts List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Performance Alerts</span>
              {hasActiveAlerts && (
                <Badge variant="destructive" className="ml-2">
                  {activeAlerts.length} active
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="space-y-3 overflow-y-auto"
            style={{ maxHeight }}
          >
            <AnimatePresence>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map(renderAlert)
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-gray-500"
                >
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">No alerts found</p>
                  <p className="text-sm">
                    {isEnabled 
                      ? 'System is running smoothly!' 
                      : 'Performance monitoring is disabled'
                    }
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceAlerts;