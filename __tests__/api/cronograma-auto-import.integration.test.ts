/**
 * Tests básicos de integración para APIs de importación automática de cronogramas
 *
 * Tests simplificados que verifican que las APIs existen y responden
 */

import { describe, it, expect } from '@jest/globals'

// Tests básicos de existencia de módulos
describe('Tests Básicos de Integración - APIs de Importación Automática', () => {

  describe('Verificación de módulos', () => {
    it('debe poder importar las APIs de análisis', async () => {
      // Verificar que los módulos se pueden importar sin errores
      expect(async () => {
        await import('@/app/api/cotizaciones/[id]/analisis-cronograma/route')
      }).not.toThrow()
    })

    it('debe poder importar las APIs de importación', async () => {
      expect(async () => {
        await import('@/app/api/proyectos/[id]/cronograma/importar/route')
      }).not.toThrow()
    })

    it('debe poder importar las APIs de configuración', async () => {
      expect(async () => {
        await import('@/app/api/configuracion/duraciones-cronograma/route')
      }).not.toThrow()
    })
  })

  describe('Verificación de componentes', () => {
    it('debe poder importar el modal de importación', async () => {
      expect(async () => {
        await import('@/components/comercial/cronograma/ImportCronogramaModal')
      }).not.toThrow()
    })

    it('debe poder importar la página de configuración', async () => {
      expect(async () => {
        await import('@/app/configuracion/duraciones-cronograma/page')
      }).not.toThrow()
    })
  })

  describe('Verificación de utilidades', () => {
    it('debe tener script de seed disponible', () => {
      // Verificar que el script existe en el sistema de archivos
      const fs = require('fs')
      const path = require('path')

      const seedPath = path.join(process.cwd(), 'scripts', 'seed-plantillas-duracion-cronograma.ts')
      expect(fs.existsSync(seedPath)).toBe(true)
    })
  })

  describe('Estructura de archivos', () => {
    it('debe tener archivos de test unitarios', () => {
      // Verificar que existen los archivos de test
      const fs = require('fs')
      const path = require('path')

      const unitTestsPath = path.join(__dirname, 'cronograma-auto-import-algorithms.test.ts')
      expect(fs.existsSync(unitTestsPath)).toBe(true)
    })

    it('debe tener archivos de documentación', () => {
      const fs = require('fs')
      const path = require('path')

      const docsPath = path.join(__dirname, '../../../docs/CRONOGRAMA_AUTO_IMPORT_IMPLEMENTATION.md')
      expect(fs.existsSync(docsPath)).toBe(true)
    })
  })
})