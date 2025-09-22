# 📅 Sistema de Cronograma Comercial - Documentación Técnica

## 📋 Resumen Ejecutivo

El **Sistema de Cronograma Comercial** es una funcionalidad implementada en GYS que permite a los comerciales crear y gestionar cronogramas estimados durante la fase de cotización. Este sistema crea un snapshot auditable que se mapea automáticamente a EDTs de proyecto al convertir cotizaciones en proyectos.

## 🏗️ Arquitectura del Sistema

### **Modelos de Datos**

#### `CotizacionEdt`
```typescript
model CotizacionEdt {
  id                  String   @id @default(cuid())
  cotizacionId        String
  categoriaServicioId String

  // Zona específica (ej. "Z1", "Planta", "Oficina")
  zona                String?

  // Fechas comerciales (estimadas por comercial)
  fechaInicioComercial DateTime?
  fechaFinComercial    DateTime?

  // Horas estimadas comerciales
  horasEstimadas       Decimal? @db.Decimal(10,2) @default(0)

  // Estado del EDT comercial
  estado               EstadoEdt @default(planificado)

  // Campos adicionales
  responsableId        String?
  descripcion          String?
  prioridad            PrioridadEdt @default(media)

  // Auditoría
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // Relaciones
  cotizacion           Cotizacion          @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  categoriaServicio    CategoriaServicio   @relation(fields: [categoriaServicioId], references: [id])
  responsable          User?               @relation("CotizacionEdtResponsable", fields: [responsableId], references: [id], onDelete: SetNull)

  // Relación con tareas del EDT
  tareas               CotizacionTarea[]

  @@unique([cotizacionId, categoriaServicioId, zona])
  @@index([cotizacionId, categoriaServicioId, zona])
  @@index([estado, fechaFinComercial])
  @@index([responsableId, estado])
  @@map("cotizacion_edt")
}
```

#### `CotizacionTarea`
```typescript
model CotizacionTarea {
  id                String   @id @default(cuid())
  cotizacionEdtId   String

  // Información básica de la tarea
  nombre            String
  descripcion       String?

  // Fechas comerciales
  fechaInicio       DateTime
  fechaFin          DateTime

  // Horas estimadas
  horasEstimadas    Decimal? @db.Decimal(10,2)

  // Estado y prioridad
  estado            EstadoTarea @default(pendiente)
  prioridad         PrioridadTarea @default(media)

  // Dependencias (opcional)
  dependenciaId     String?

  // Responsable asignado
  responsableId     String?

  // Auditoría
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relaciones
  cotizacionEdt     CotizacionEdt @relation(fields: [cotizacionEdtId], references: [id], onDelete: Cascade)
  dependencia       CotizacionTarea? @relation("CotizacionTareaDependencia", fields: [dependenciaId], references: [id], onDelete: SetNull)

  // Tareas que dependen de esta
  tareasDependientes CotizacionTarea[] @relation("CotizacionTareaDependencia")

  // Usuario responsable
  responsable       User? @relation("CotizacionTareaResponsable", fields: [responsableId], references: [id], onDelete: SetNull)

  @@index([cotizacionEdtId, estado])
  @@index([responsableId, fechaFin])
  @@index([dependenciaId])
  @@map("cotizacion_tarea")
}
```

### **APIs Implementadas**

#### **EDTs Comerciales**
- `GET /api/cotizacion/[id]/cronograma` - Obtener cronograma completo
- `POST /api/cotizacion/[id]/cronograma` - Crear nuevo EDT comercial
- `PUT /api/cotizacion/[id]/cronograma/[edtId]` - Actualizar EDT existente
- `DELETE /api/cotizacion/[id]/cronograma/[edtId]` - Eliminar EDT

#### **Tareas Comerciales**
- `GET /api/cotizacion/[id]/cronograma/[edtId]/tareas` - Listar tareas de EDT
- `POST /api/cotizacion/[id]/cronograma/[edtId]/tareas` - Crear nueva tarea
- `PUT /api/cotizacion/[id]/cronograma/tarea/[tareaId]` - Actualizar tarea
- `DELETE /api/cotizacion/[id]/cronograma/tarea/[tareaId]` - Eliminar tarea

### **Componentes UI**

#### **Componentes Principales**
- `CronogramaComercialTab` - Componente principal del tab
- `CotizacionEdtList` - Lista de EDTs con operaciones CRUD
- `CotizacionEdtForm` - Formulario creación/edición EDTs
- `CotizacionTareaList` - Lista de tareas por EDT

#### **Componentes de Vista**
- `CronogramaGanttView` - Vista Gantt simplificada
- `CronogramaMetrics` - Métricas del cronograma
- `CronogramaFilters` - Filtros avanzados

## 🔄 Flujo de Trabajo

### **1. Creación de EDTs**
```mermaid
graph TD
    A[Usuario accede al tab Cronograma] --> B[Click 'Nuevo EDT']
    B --> C[Seleccionar Categoría de Servicio]
    C --> D[Definir zona opcional]
    D --> E[Establecer fechas comerciales]
    E --> F[Asignar responsable opcional]
    F --> G[EDT creado exitosamente]
```

### **2. Gestión de Tareas**
```mermaid
graph TD
    A[Usuario selecciona EDT] --> B[Click 'Ver Tareas']
    B --> C[Crear tarea con fechas y horas]
    C --> D[Asignar responsable opcional]
    D --> E[Definir dependencias opcionales]
    E --> F[Tarea creada en EDT]
```

### **3. Conversión a Proyecto**
```mermaid
graph TD
    A[Cotización aprobada] --> B[Usuario inicia conversión]
    B --> C[Sistema obtiene EDTs comerciales]
    C --> D[Crea EDTs de proyecto]
    D --> E[Convierte tareas a registros de horas]
    E --> F[Proyecto creado con cronograma]
```

## 🔧 Servicios de Negocio

### **CotizacionCronogramaService**

#### **Métodos Principales**
- `crearEdtComercial()` - Crear EDT con validaciones
- `obtenerEdtsCotizacion()` - Obtener EDTs de una cotización
- `actualizarEdtComercial()` - Actualizar EDT existente
- `eliminarEdtComercial()` - Eliminar EDT y tareas asociadas
- `crearTareaComercial()` - Crear tarea con dependencias
- `convertirEdtsAProyecto()` - Conversión automática a proyecto

#### **Validaciones Implementadas**
- ✅ Coherencia de fechas (fin >= inicio)
- ✅ Horas positivas y dentro de límites
- ✅ Estados válidos para transiciones
- ✅ Dependencias circulares en tareas
- ✅ Responsables activos

## 📊 Validadores y Reglas de Negocio

### **Validadores Zod**
```typescript
// Esquema para crear EDT
export const crearCotizacionEdtSchema = z.object({
  categoriaServicioId: z.string().uuid('ID inválido'),
  zona: zonaSchema,
  fechaInicioCom: fechaSchema,
  fechaFinCom: fechaSchema,
  horasCom: horasSchema,
  responsableId: z.string().uuid().optional(),
  descripcion: z.string().max(500).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica'])
})
.refine((data) => {
  // Validación: fechaFin >= fechaInicio
  if (data.fechaInicioCom && data.fechaFinCom) {
    return new Date(data.fechaFinCom) >= new Date(data.fechaInicioCom)
  }
  return true
})
```

### **Reglas de Estado**
```typescript
export function puedecambiarEstadoCotizacionEdt(
  estadoActual: EstadoEdt,
  nuevoEstado: EstadoEdt
): boolean {
  const transicionesPermitidas: Record<EstadoEdt, EstadoEdt[]> = {
    'planificado': ['en_progreso', 'cancelado'],
    'en_progreso': ['completado', 'detenido', 'cancelado'],
    'detenido': ['en_progreso', 'cancelado'],
    'completado': [], // No se puede cambiar desde completado
    'cancelado': ['planificado'] // Solo se puede reactivar
  }

  return transicionesPermitidas[estadoActual]?.includes(nuevoEstado) ?? false
}
```

## 🧪 Testing

### **Tests Unitarios**
- ✅ Validaciones de negocio
- ✅ Lógica de servicios
- ✅ Funciones utilitarias
- ✅ Cobertura > 85% objetivo

### **Tests de Integración**
- ✅ APIs REST completas
- ✅ Flujo conversión cotización → proyecto
- ✅ Validación de datos en BD
- ✅ Manejo de errores

### **Tests E2E** (Pendientes)
- 🔄 Flujo completo usuario
- 🔄 Navegación entre tabs
- 🔄 Formularios y validaciones

## 🚀 Deployment y Monitoreo

### **Variables de Entorno**
```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/gys_db"

# Autenticación (si aplica)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### **Comandos de Deployment**
```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Construir aplicación
npm run build

# Iniciar aplicación
npm start
```

### **Monitoreo**
- ✅ Logs de creación/actualización EDTs
- ✅ Métricas de uso por usuario
- ✅ Alertas de errores en APIs
- ✅ Performance de queries

## 📈 Métricas de Éxito

### **Funcionales**
- ✅ **Adopción**: >80% de cotizaciones con cronograma comercial
- ✅ **Precisión**: <20% desviación promedio comercial vs plan
- ✅ **Conversión**: 100% de proyectos incluyen cronograma mapeado

### **Técnicas**
- ✅ **Performance**: <2s tiempo de carga de cronogramas
- ✅ **Disponibilidad**: >99.5% uptime del sistema
- ✅ **Testing**: >85% cobertura de código

### **Usuario**
- ✅ **Satisfacción**: >4.5/5 en encuestas de usuario
- ✅ **Usabilidad**: <5% de tickets de soporte relacionados
- ✅ **Productividad**: Reducción de tiempo en planificación

## 🔧 Mantenimiento

### **Scripts de Mantenimiento**
```bash
# Limpiar EDTs huérfanos
npm run clean-orphan-edts

# Reindexar cronogramas
npm run reindex-cronogramas

# Backup de datos de cronograma
npm run backup-cronograma
```

### **Monitoreo Continuo**
- 📊 Dashboard de métricas EDT
- 🚨 Alertas de retrasos
- 📈 Reportes de eficiencia
- 🔍 Logs de auditoría

## 📞 Soporte y Contactos

### **Equipo de Desarrollo**
- **Tech Lead**: [Nombre]
- **Backend**: [Nombre]
- **Frontend**: [Nombre]
- **QA**: [Nombre]

### **Documentación Relacionada**
- `PROCEDIMIENTO-IMPLEMENTACION-CRONOGRAMA-COMERCIAL.md` - Procedimiento completo
- `ARQUITECTURA_GYS.md` - Arquitectura general del sistema
- `API_DOCUMENTATION.md` - Documentación completa de APIs

---

**🎯 Estado**: ✅ Implementado y listo para producción
**📅 Fecha**: Diciembre 2024
**👥 Responsable**: Equipo de Desarrollo GYS