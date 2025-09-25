# Plan de Implementación: Sistema de Importación Flexible de Plantillas

## 📋 Resumen Ejecutivo

Este documento detalla la implementación de un sistema flexible de importación de plantillas que permite:
- Mantener plantillas completas existentes
- Crear plantillas especializadas por categoría (equipos, servicios, gastos)
- Importar componentes de plantillas de forma individual en cotizaciones existentes

**Opción Seleccionada:** Sistema de Plantillas por Categoría (Opción 1)

---

## 🎯 Objetivos del Sistema

1. **Flexibilidad Máxima:** Permitir composición de cotizaciones desde múltiples fuentes
2. **Reutilización:** Maximizar el uso de componentes pre-configurados
3. **Simplicidad:** Mantener interfaz intuitiva para usuarios
4. **Compatibilidad:** No romper funcionalidad existente

---

## 🏗️ Arquitectura del Sistema

### Modelo de Datos Actual
```
Plantilla (completa)
├── PlantillaEquipo[]
│   └── PlantillaEquipoItem[]
├── PlantillaServicio[]
│   └── PlantillaServicioItem[]
└── PlantillaGasto[]
    └── PlantillaGastoItem[]
```

### Modelo de Datos Propuesto
```
Plantilla (completa | equipos | servicios | gastos)
├── tipo: 'completa' | 'equipos' | 'servicios' | 'gastos'
├── PlantillaEquipo[] (solo si tipo incluye equipos)
├── PlantillaServicio[] (solo si tipo incluye servicios)
└── PlantillaGasto[] (solo si tipo incluye gastos)
```

---

## 📊 Cambios en Base de Datos

### 1. Modificación de Tabla `Plantilla`

```sql
-- Agregar columna tipo a tabla existente
ALTER TABLE "Plantilla" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'completa';

-- Crear índice para filtrado eficiente
CREATE INDEX "Plantilla_tipo_idx" ON "Plantilla"("tipo");

-- Actualizar plantillas existentes
UPDATE "Plantilla" SET "tipo" = 'completa' WHERE "tipo" IS NULL;
```

### 2. Nueva Tabla `CotizacionPlantillaImport`

```sql
CREATE TABLE "CotizacionPlantillaImport" (
  "id" TEXT PRIMARY KEY DEFAULT cuid(),
  "cotizacionId" TEXT NOT NULL,
  "plantillaId" TEXT NOT NULL,
  "tipoImportacion" TEXT NOT NULL, -- 'completa' | 'equipos' | 'servicios' | 'gastos'
  "fechaImportacion" TIMESTAMP DEFAULT NOW(),
  "usuarioId" TEXT NOT NULL,

  FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE,
  FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE,
  FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "CotizacionPlantillaImport_cotizacion_idx" ON "CotizacionPlantillaImport"("cotizacionId");
CREATE INDEX "CotizacionPlantillaImport_plantilla_idx" ON "CotizacionPlantillaImport"("plantillaId");
```

---

## 🔧 APIs a Implementar

### 1. API de Plantillas por Tipo
**Endpoint:** `GET /api/plantillas?tipo={tipo}`

```typescript
// Respuesta filtrada por tipo
interface PlantillaResponse {
  id: string;
  nombre: string;
  tipo: 'completa' | 'equipos' | 'servicios' | 'gastos';
  totalCliente: number;
  totalInterno: number;
  equipos?: PlantillaEquipo[];
  servicios?: PlantillaServicio[];
  gastos?: PlantillaGasto[];
}
```

### 2. API de Importación por Componentes
**Endpoint:** `POST /api/cotizaciones/{id}/importar-plantilla`

```typescript
interface ImportRequest {
  plantillaId: string;
  tipoImportacion: 'equipos' | 'servicios' | 'gastos';
  opciones: {
    mantenerNombres?: boolean;
    sobreescribirDuplicados?: boolean;
    prefijoNombre?: string;
  };
}

interface ImportResponse {
  equiposImportados: number;
  serviciosImportados: number;
  gastosImportados: number;
  conflictos: ConflictInfo[];
  totalesActualizados: {
    equipos: { interno: number; cliente: number };
    servicios: { interno: number; cliente: number };
    gastos: { interno: number; cliente: number };
  };
}
```

### 3. API de Historial de Importaciones
**Endpoint:** `GET /api/cotizaciones/{id}/historial-importaciones`

```typescript
interface ImportHistory {
  id: string;
  plantilla: {
    id: string;
    nombre: string;
    tipo: string;
  };
  tipoImportacion: string;
  fechaImportacion: string;
  usuario: {
    id: string;
    name: string;
  };
  componentesImportados: {
    equipos: number;
    servicios: number;
    gastos: number;
  };
}
```

---

## 🎨 Cambios en Interfaz de Usuario

### 1. Página de Gestión de Plantillas (`/comercial/plantillas`)

#### Filtros por Tipo
```tsx
// Agregar filtro por tipo de plantilla
const [filtroTipo, setFiltroTipo] = useState<string>('todos');

const tiposDisponibles = [
  { value: 'todos', label: 'Todas las Plantillas' },
  { value: 'completa', label: 'Completas' },
  { value: 'equipos', label: 'Solo Equipos' },
  { value: 'servicios', label: 'Solo Servicios' },
  { value: 'gastos', label: 'Solo Gastos' }
];
```

#### Modal de Creación de Plantilla
```tsx
// Agregar selección de tipo en creación
const tiposPlantilla = [
  {
    value: 'completa',
    label: 'Plantilla Completa',
    descripcion: 'Equipos, servicios y gastos'
  },
  {
    value: 'equipos',
    label: 'Plantilla de Equipos',
    descripcion: 'Solo configuración de equipos'
  },
  {
    value: 'servicios',
    label: 'Plantilla de Servicios',
    descripcion: 'Solo configuración de servicios'
  },
  {
    value: 'gastos',
    label: 'Plantilla de Gastos',
    descripcion: 'Solo configuración de gastos'
  }
];
```

### 2. Página de Edición de Cotización (`/comercial/cotizaciones/{id}`)

#### Botones de Importación por Sección
```tsx
// En sección de Equipos
<div className="flex justify-between items-center mb-4">
  <h3 className="text-lg font-medium">Equipos</h3>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowImportEquiposModal(true)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Importar Plantilla de Equipos
  </Button>
</div>

// En sección de Servicios
<div className="flex justify-between items-center mb-4">
  <h3 className="text-lg font-medium">Servicios</h3>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowImportServiciosModal(true)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Importar Plantilla de Servicios
  </Button>
</div>

// En sección de Gastos
<div className="flex justify-between items-center mb-4">
  <h3 className="text-lg font-medium">Gastos</h3>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowImportGastosModal(true)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Importar Plantilla de Gastos
  </Button>
</div>
```

#### Modal de Importación
```tsx
interface ImportModalProps {
  tipo: 'equipos' | 'servicios' | 'gastos';
  cotizacionId: string;
  onSuccess: (result: ImportResponse) => void;
  onClose: () => void;
}

// Componente reutilizable para importar cualquier tipo
function ImportPlantillaModal({ tipo, cotizacionId, onSuccess, onClose }: ImportModalProps) {
  // Lógica de importación...
}
```

### 3. Modal de Creación desde CRM

#### Mantener Compatibilidad
- Opción "Desde Plantilla" → mostrar solo plantillas tipo 'completa'
- Agregar información sobre importación posterior

---

## ⚡ Lógica de Negocio

### 1. Reglas de Importación

#### Duplicados y Conflictos
```typescript
interface ConflictInfo {
  tipo: 'equipo' | 'servicio' | 'gasto';
  nombreOriginal: string;
  nombreConflicto: string;
  accionRecomendada: 'reemplazar' | 'mantener_ambos' | 'cancelar';
}

function detectarConflictos(
  itemsExistentes: any[],
  itemsNuevos: any[],
  campoNombre: string
): ConflictInfo[] {
  // Lógica para detectar nombres duplicados
}
```

#### Estrategias de Resolución
1. **Reemplazar:** Eliminar item existente y usar el nuevo
2. **Mantener Ambos:** Renombrar automáticamente (agregar sufijo)
3. **Cancelar:** Detener importación y mostrar conflictos

### 2. Cálculo de Totales

```typescript
function recalcularTotalesCotizacion(cotizacionId: string) {
  // Recalcular totales después de importación
  // Actualizar campos: totalEquiposInterno, totalEquiposCliente, etc.
}
```

### 3. Validación de Integridad

```typescript
function validarPlantillaParaImportacion(plantilla: Plantilla, tipo: string): ValidationResult {
  // Verificar que la plantilla tenga el tipo correcto
  // Validar referencias a catálogos, recursos, etc.
  // Verificar que no haya datos corruptos
}
```

---

## 🔄 Flujo de Migración

### Paso 1: Actualización de Base de Datos
```bash
# Ejecutar migración
npx prisma migrate dev --name add_plantilla_tipo
```

### Paso 2: Actualización de Datos Existentes
```sql
-- Marcar todas las plantillas existentes como 'completa'
UPDATE "Plantilla" SET "tipo" = 'completa' WHERE "tipo" IS NULL;
```

### Paso 3: Despliegue por Etapas
1. **Etapa 1:** Actualizar backend y base de datos
2. **Etapa 2:** Desplegar APIs nuevas
3. **Etapa 3:** Actualizar componentes frontend
4. **Etapa 4:** Pruebas de integración
5. **Etapa 5:** Entrenamiento de usuarios

---

## 🧪 Plan de Pruebas

### 1. Pruebas Unitarias
- Validación de tipos de plantilla
- Lógica de detección de conflictos
- Cálculos de totales

### 2. Pruebas de Integración
- Importación desde CRM
- Importación en cotizaciones existentes
- Recálculo de totales

### 3. Pruebas E2E
- Flujo completo de creación e importación
- Manejo de errores y conflictos
- Performance con plantillas grandes

### 4. Pruebas de Regresión
- Funcionalidad existente no afectada
- Compatibilidad con cotizaciones antiguas

---

## 📈 Métricas de Éxito

1. **Adopción:** Porcentaje de cotizaciones que usan importación flexible
2. **Eficiencia:** Tiempo reducido en creación de cotizaciones
3. **Satisfacción:** Retroalimentación de usuarios comerciales
4. **Reutilización:** Número de plantillas reutilizadas

---

## 🚀 Roadmap de Implementación

### Semana 1-2: Fundamentos
- [ ] Actualizar esquema de base de datos
- [ ] Crear APIs básicas de filtrado
- [ ] Implementar tabla de historial

### Semana 3-4: APIs de Importación
- [ ] API de importación por componentes
- [ ] Lógica de resolución de conflictos
- [ ] Recálculo automático de totales

### Semana 5-6: Interfaz de Usuario
- [ ] Actualizar página de plantillas
- [ ] Modales de importación
- [ ] Indicadores visuales en cotizaciones

### Semana 7-8: Pruebas y Optimización
- [ ] Pruebas exhaustivas
- [ ] Optimización de performance
- [ ] Documentación de usuario

---

## 🔐 Consideraciones de Seguridad

1. **Validación de Permisos:** Verificar que usuario tenga acceso a plantillas
2. **Auditoría:** Registrar todas las importaciones en audit log
3. **Validación de Datos:** Sanitizar inputs y validar referencias
4. **Rate Limiting:** Prevenir importaciones masivas accidentales

---

## 📚 Documentación Adicional

- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./RELACIONES_BD_APROVISIONAMIENTO.md)
- [User Guide](./GUIA_USUARIO_COTIZACIONES.md)

---

## 👥 Equipo Responsable

- **Arquitecto:** Definir estructura técnica
- **Backend Developer:** Implementar APIs y lógica de negocio
- **Frontend Developer:** Desarrollar interfaz de usuario
- **QA Engineer:** Pruebas y validación
- **Product Owner:** Validar requerimientos y aceptación

---

*Documento creado el: 2025-01-24*
*Última actualización: 2025-01-24*
*Versión: 1.0*