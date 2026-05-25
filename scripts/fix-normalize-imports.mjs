/**
 * Adds `import { normalizeStr } from '@/lib/utils'` to all files
 * that use normalizeStr but don't import it yet.
 */
import { readFileSync, writeFileSync } from 'fs'

const files = [
  'src/app/catalogo/categorias-condicion/page.tsx',
  'src/app/catalogo/categorias-equipo/page.tsx',
  'src/app/catalogo/categorias-exclusion/page.tsx',
  'src/app/catalogo/categorias-gasto/page.tsx',
  'src/app/catalogo/condiciones/page.tsx',
  'src/app/catalogo/edts/page.tsx',
  'src/app/catalogo/exclusiones/page.tsx',
  'src/app/catalogo/gastos/page.tsx',
  'src/app/catalogo/unidades-servicio/page.tsx',
  'src/app/catalogo/unidades/page.tsx',
  'src/app/comercial/clientes/page.tsx',
  'src/app/configuracion/duraciones-cronograma/page.tsx',
  'src/app/crm/clientes/page.tsx',
  'src/app/logistica/listas/[id]/cotizaciones/components/QuotationList.tsx',
  'src/app/proyectos/[id]/servicios/page.tsx',
  'src/components/catalogo/CatalogoEquipoList.tsx',
  'src/components/catalogo/CatalogoEquiposView.tsx',
  'src/components/catalogo/CatalogoServicioList.tsx',
  'src/components/catalogo/CatalogoServicioTable.tsx',
  'src/components/catalogo/EquipoCatalogoModal.tsx',
  'src/components/comercial/cronograma/BulkImportServicioItemsModal.tsx',
  'src/components/comercial/cronograma/CronogramaGanttViewPro.tsx',
  'src/components/configuracion/UserActivityDashboard.tsx',
  'src/components/cotizaciones/VincularCatalogoModal.tsx',
  'src/components/equipos/ModalAgregarItemDesdeCatalogo.tsx',
  'src/components/equipos/ModalAgregarItemDesdeEquipo.tsx',
  'src/components/horas-hombre/AprobacionCampoList.tsx',
  'src/components/horas-hombre/ListaHistorialHoras.tsx',
  'src/components/horas-hombre/RegistroCampoWizard.tsx',
  'src/components/horas-hombre/jornada/JornadaFormModal.tsx',
  'src/components/logistica/ModalSolicitarOtroProveedor.tsx',
  'src/components/plantillas/PlantillasView.tsx',
  'src/components/plantillas/equipos/PlantillaEquipoIndependienteMultiAddModal.tsx',
  'src/components/plantillas/servicios/PlantillaServicioIndependienteMultiAddModal.tsx',
  'src/components/proyectos/ProyectoEquipoItemTabla.tsx',
  'src/components/proyectos/cronograma/ImportExcelCronogramaModal.tsx',
  'src/components/proyectos/equipos/VistaListaCompacta.tsx',
]

const FUNC = 'normalizeStr'
const IMPORT = `import { ${FUNC} } from '@/lib/utils'`
let fixed = 0

for (const rel of files) {
  let src = readFileSync(rel, 'utf8')

  // Already imported?
  if (src.includes(IMPORT) || new RegExp(`\\{[^}]*${FUNC}[^}]*\\}.*from.*@/lib/utils`).test(src)) {
    console.log(`  ⏭  ${rel} (already imported)`)
    continue
  }

  // Try to add to existing @/lib/utils import
  const existingImport = /^(import\s*\{)([^}]*)\}\s*from\s*(['"]@\/lib\/utils['"])/m
  if (existingImport.test(src)) {
    src = src.replace(existingImport, (_, prefix, inner, from) =>
      `${prefix}${inner.trimEnd()}, ${FUNC} }  from ${from}`
    )
  } else {
    // Add new import after 'use client' line or at top
    const useClientMatch = src.match(/^(['"]use client['"][^\n]*\n)/)
    if (useClientMatch) {
      src = src.replace(useClientMatch[0], `${useClientMatch[0]}\n${IMPORT}\n`)
    } else {
      src = `${IMPORT}\n` + src
    }
  }

  writeFileSync(rel, src, 'utf8')
  fixed++
  console.log(`  ✓ ${rel}`)
}

console.log(`\nDone. ${fixed} files updated.`)
