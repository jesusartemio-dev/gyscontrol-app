'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, Package, ChevronDown, ChevronUp } from 'lucide-react'

// Demo data
const demoItems = [
  {
    id: '1',
    nombre: 'Logica de Mapeo de I/Os (PLC-IOs)',
    descripcion: 'Asociación de señales DI/DO/AI/AO entre campo y PLC',
    cantidad: 1,
    precioInterno: 110,
    precioCliente: 148.50,
    recurso: 'Ingeniero Senior',
    unidad: 'hora'
  },
  {
    id: '2',
    nombre: 'Logica de Mapeo de Variadores (PLC-DRV)',
    descripcion: 'Asociación de señales y parámetros del variador con estructuras UDT del PLC',
    cantidad: 2,
    precioInterno: 132,
    precioCliente: 178.20,
    recurso: 'Ingeniero Senior',
    unidad: 'hora'
  },
  {
    id: '3',
    nombre: 'Configuración de hardware y comunicación',
    descripcion: 'Configuración de I/O tree, módulos, RPIs, AOPs y redes de comunicación del PLC',
    cantidad: 1,
    precioInterno: 88,
    precioCliente: 118.80,
    recurso: 'Ingeniero Junior',
    unidad: 'hora'
  },
]

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

// =====================================================
// OPCIÓN 1: Layout Actual (40/60)
// =====================================================
function ModalOpcion1({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Opción 1: Proporción 40/60 (Más espacio a seleccionados)
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[40%_60%] gap-4 flex-1 overflow-hidden">
          {/* Columna Izquierda - 40% */}
          <div className="flex flex-col overflow-hidden border-r pr-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium">Servicios Disponibles</h3>
              <Badge variant="outline">16</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="p-3 border rounded-lg hover:border-blue-300 cursor-pointer">
                  <h4 className="font-medium text-sm">Servicio de ejemplo {i}</h4>
                  <p className="text-xs text-gray-500">Descripción del servicio...</p>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha - 60% */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium">Servicios Seleccionados</h3>
              <Badge className="bg-blue-100 text-blue-600">{demoItems.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {demoItems.map((item) => (
                <div key={item.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-blue-900">{item.nombre}</h4>
                      <p className="text-xs text-blue-700">{item.descripcion}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Fila de campos - horizontal pero con más espacio */}
                  <div className="grid grid-cols-4 gap-3 mb-2">
                    <div>
                      <Label className="text-xs text-gray-600">Cantidad</Label>
                      <Input type="number" value={item.cantidad} className="h-8 text-sm" readOnly />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Precio Interno</Label>
                      <Input value={formatCurrency(item.precioInterno)} className="h-8 text-sm" readOnly />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Precio Cliente</Label>
                      <Input value={formatCurrency(item.precioCliente)} className="h-8 text-sm" readOnly />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Total</Label>
                      <div className="h-8 flex items-center font-bold text-green-600">
                        {formatCurrency(item.cantidad * item.precioCliente)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Recurso</Label>
                      <Select value={item.recurso}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ingeniero Senior">Ingeniero Senior</SelectItem>
                          <SelectItem value="Ingeniero Junior">Ingeniero Junior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Unidad</Label>
                      <Select value={item.unidad}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hora">hora</SelectItem>
                          <SelectItem value="día">día</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex justify-between w-full items-center">
            <div className="text-sm font-bold text-blue-600">
              Total: {formatCurrency(demoItems.reduce((sum, i) => sum + i.cantidad * i.precioCliente, 0))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Agregar ({demoItems.length})
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// OPCIÓN 2: Layout Vertical (Cards apiladas)
// =====================================================
function ModalOpcion2({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Opción 2: Layout Vertical (Cards con campos apilados)
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Columna Izquierda */}
          <div className="flex flex-col overflow-hidden border-r pr-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium">Servicios Disponibles</h3>
              <Badge variant="outline">16</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="p-3 border rounded-lg hover:border-green-300 cursor-pointer">
                  <h4 className="font-medium text-sm">Servicio de ejemplo {i}</h4>
                  <p className="text-xs text-gray-500">Descripción del servicio...</p>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha - Cards verticales */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium">Servicios Seleccionados</h3>
              <Badge className="bg-green-100 text-green-600">{demoItems.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {demoItems.map((item) => (
                <Card key={item.id} className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold text-green-900">
                          {item.nombre}
                        </CardTitle>
                        <p className="text-xs text-green-700 mt-1">{item.descripcion}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-500 h-7 w-7 p-0 -mt-1 -mr-2">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {/* Fila 1 */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-600">Cantidad:</Label>
                        <Input type="number" value={item.cantidad} className="h-7 w-20 text-sm text-right" readOnly />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-600">Recurso:</Label>
                        <Select value={item.recurso}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ingeniero Senior">Ing. Senior</SelectItem>
                            <SelectItem value="Ingeniero Junior">Ing. Junior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fila 2 */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-600">P. Interno:</Label>
                        <Input value={formatCurrency(item.precioInterno)} className="h-7 w-24 text-sm text-right" readOnly />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-600">Unidad:</Label>
                        <Select value={item.unidad}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hora">hora</SelectItem>
                            <SelectItem value="día">día</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fila 3 */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-600">P. Cliente:</Label>
                        <Input value={formatCurrency(item.precioCliente)} className="h-7 w-24 text-sm text-right" readOnly />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-green-700">Total:</Label>
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(item.cantidad * item.precioCliente)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex justify-between w-full items-center">
            <div className="text-sm font-bold text-green-600">
              Total: {formatCurrency(demoItems.reduce((sum, i) => sum + i.cantidad * i.precioCliente, 0))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Agregar ({demoItems.length})
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// OPCIÓN 3: Cards Compactas Expandibles
// =====================================================
function ModalOpcion3({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Opción 3: Cards Compactas Expandibles
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Columna Izquierda */}
          <div className="flex flex-col overflow-hidden border-r pr-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium">Servicios Disponibles</h3>
              <Badge variant="outline">16</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="p-3 border rounded-lg hover:border-purple-300 cursor-pointer">
                  <h4 className="font-medium text-sm">Servicio de ejemplo {i}</h4>
                  <p className="text-xs text-gray-500">Descripción del servicio...</p>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha - Cards expandibles */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <h3 className="font-medium">Servicios Seleccionados</h3>
              <Badge className="bg-purple-100 text-purple-600">{demoItems.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {demoItems.map((item) => {
                const isExpanded = expandedId === item.id
                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg transition-all ${
                      isExpanded ? 'border-purple-400 bg-purple-50' : 'border-purple-200 bg-purple-50/50'
                    }`}
                  >
                    {/* Header siempre visible */}
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-purple-900 truncate">
                            {item.nombre}
                          </h4>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            x{item.cantidad}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          <span className="text-gray-500">{item.recurso}</span>
                          <span className="font-semibold text-purple-600">
                            {formatCurrency(item.cantidad * item.precioCliente)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation() }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-purple-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                    </div>

                    {/* Contenido expandible */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-purple-200">
                        <p className="text-xs text-purple-700 mb-3 mt-2">{item.descripcion}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">Cantidad</Label>
                            <Input type="number" value={item.cantidad} className="h-8 text-sm" readOnly />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Recurso</Label>
                            <Select value={item.recurso}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ingeniero Senior">Ing. Senior</SelectItem>
                                <SelectItem value="Ingeniero Junior">Ing. Junior</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Precio Interno</Label>
                            <Input value={formatCurrency(item.precioInterno)} className="h-8 text-sm" readOnly />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Unidad</Label>
                            <Select value={item.unidad}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hora">hora</SelectItem>
                                <SelectItem value="día">día</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Precio Cliente</Label>
                            <Input value={formatCurrency(item.precioCliente)} className="h-8 text-sm" readOnly />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Total</Label>
                            <div className="h-8 flex items-center font-bold text-purple-600 text-lg">
                              {formatCurrency(item.cantidad * item.precioCliente)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex justify-between w-full items-center">
            <div className="text-sm font-bold text-purple-600">
              Total: {formatCurrency(demoItems.reduce((sum, i) => sum + i.cantidad * i.precioCliente, 0))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Agregar ({demoItems.length})
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// PÁGINA PRINCIPAL DE DEMO
// =====================================================
export default function ModalLayoutsDemo() {
  const [openModal, setOpenModal] = useState<1 | 2 | 3 | null>(null)

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Demo: Layouts de Modal</h1>
      <p className="text-gray-600 mb-8">
        Haz clic en cada botón para ver cómo se vería el modal con múltiples items seleccionados.
      </p>

      <div className="grid grid-cols-3 gap-6">
        {/* Opción 1 */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-600">Opción 1: Proporción 40/60</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Más espacio para la columna de seleccionados. Los campos están en una cuadrícula horizontal.
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4">
              <li>✓ Vista clara de todos los campos</li>
              <li>✓ Grid organizado</li>
              <li>✗ Cards más altas</li>
            </ul>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setOpenModal(1)}
            >
              Ver Demo
            </Button>
          </CardContent>
        </Card>

        {/* Opción 2 */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-600">Opción 2: Layout Vertical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Cards con campos en dos columnas internas. Más compacto pero legible.
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4">
              <li>✓ Muy organizado visualmente</li>
              <li>✓ Fácil de escanear</li>
              <li>✓ Balance entre espacio y datos</li>
            </ul>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => setOpenModal(2)}
            >
              Ver Demo
            </Button>
          </CardContent>
        </Card>

        {/* Opción 3 */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-600">Opción 3: Expandibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Cards compactas que se expanden al hacer clic. Ideal para muchos items.
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4">
              <li>✓ Muy compacto cerrado</li>
              <li>✓ Detalles bajo demanda</li>
              <li>✗ Requiere más clics</li>
            </ul>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => setOpenModal(3)}
            >
              Ver Demo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <ModalOpcion1 isOpen={openModal === 1} onClose={() => setOpenModal(null)} />
      <ModalOpcion2 isOpen={openModal === 2} onClose={() => setOpenModal(null)} />
      <ModalOpcion3 isOpen={openModal === 3} onClose={() => setOpenModal(null)} />
    </div>
  )
}
