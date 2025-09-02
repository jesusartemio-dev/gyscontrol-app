'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Search, Plus } from 'lucide-react'

export interface SearchCriterion {
  id: string
  field: string
  operator: string
  value: string
  label?: string
}

export interface SearchField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
}

export interface AdvancedSearchProps {
  fields: SearchField[]
  onSearch: (criteria: SearchCriterion[]) => void
  onClear: () => void
  className?: string
}

const operators = {
  text: [
    { value: 'contains', label: 'Contiene' },
    { value: 'equals', label: 'Igual a' },
    { value: 'startsWith', label: 'Comienza con' },
    { value: 'endsWith', label: 'Termina con' }
  ],
  number: [
    { value: 'equals', label: 'Igual a' },
    { value: 'gt', label: 'Mayor que' },
    { value: 'gte', label: 'Mayor o igual' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor o igual' }
  ],
  date: [
    { value: 'equals', label: 'Igual a' },
    { value: 'after', label: 'Después de' },
    { value: 'before', label: 'Antes de' },
    { value: 'between', label: 'Entre' }
  ],
  select: [
    { value: 'equals', label: 'Igual a' },
    { value: 'in', label: 'Incluye' }
  ]
}

export function AdvancedSearch({ fields, onSearch, onClear, className }: AdvancedSearchProps) {
  const [criteria, setCriteria] = useState<SearchCriterion[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addCriterion = () => {
    const newCriterion: SearchCriterion = {
      id: Date.now().toString(),
      field: fields[0]?.key || '',
      operator: 'contains',
      value: ''
    }
    setCriteria([...criteria, newCriterion])
  }

  const updateCriterion = (id: string, updates: Partial<SearchCriterion>) => {
    setCriteria(criteria.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  const removeCriterion = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id))
  }

  const handleSearch = () => {
    const validCriteria = criteria.filter(c => c.field && c.operator && c.value)
    onSearch(validCriteria)
  }

  const handleClear = () => {
    setCriteria([])
    onClear()
  }

  const getFieldType = (fieldKey: string): 'text' | 'number' | 'date' | 'select' => {
    return fields.find(f => f.key === fieldKey)?.type || 'text'
  }

  const getFieldOptions = (fieldKey: string) => {
    return fields.find(f => f.key === fieldKey)?.options || []
  }

  const getFieldLabel = (fieldKey: string) => {
    return fields.find(f => f.key === fieldKey)?.label || fieldKey
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Search className="h-4 w-4 mr-2" />
          Búsqueda Avanzada
        </Button>
        
        {criteria.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {criteria.length} criterio{criteria.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Búsqueda Avanzada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {criteria.map((criterion) => {
              const fieldType = getFieldType(criterion.field)
              const fieldOptions = getFieldOptions(criterion.field)
              
              return (
                <div key={criterion.id} className="flex items-end gap-2 p-3 border rounded-lg">
                  {/* Campo */}
                  <div className="flex-1">
                    <Label>Campo</Label>
                    <Select
                      value={criterion.field}
                      onValueChange={(value) => updateCriterion(criterion.id, { field: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operador */}
                  <div className="flex-1">
                    <Label>Operador</Label>
                    <Select
                      value={criterion.operator}
                      onValueChange={(value) => updateCriterion(criterion.id, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators[fieldType].map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor */}
                  <div className="flex-1">
                    <Label>Valor</Label>
                    {fieldType === 'select' ? (
                      <Select
                        value={criterion.value}
                        onValueChange={(value) => updateCriterion(criterion.id, { value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
                        value={criterion.value}
                        onChange={(e) => updateCriterion(criterion.id, { value: e.target.value })}
                        placeholder={`Ingrese ${getFieldLabel(criterion.field).toLowerCase()}`}
                      />
                    )}
                  </div>

                  {/* Eliminar */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCriterion(criterion.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={addCriterion}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Criterio
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClear}
                >
                  Limpiar
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={criteria.length === 0}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}