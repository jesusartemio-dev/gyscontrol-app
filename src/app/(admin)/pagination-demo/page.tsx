/**
 * 📄 Página de Demostración de Paginación
 * 
 * Página para demostrar el funcionamiento del componente
 * DataPagination integrado con el sistema GYS.
 * 
 * @author Sistema GYS
 * @version 1.0.0
 */

import React from 'react'
import { Metadata } from 'next'
import { PaginationExamples } from '@/components/examples/pagination-example'

// 📄 Metadatos de la página
export const metadata: Metadata = {
  title: 'Demostración de Paginación | Sistema GYS',
  description: 'Ejemplos de uso del componente de paginación en el sistema GYS'
}

// 📄 Página principal
export default function PaginationDemoPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Demostración de Paginación
        </h1>
        <p className="text-gray-600">
          Ejemplos de implementación del componente DataPagination con diferentes configuraciones
          y casos de uso del sistema GYS.
        </p>
      </div>
      
      <PaginationExamples />
    </div>
  )
}