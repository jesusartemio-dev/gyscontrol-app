# 🔧 CRM Technical Handover - Sistema GYS

## 📋 Resumen Ejecutivo

Este documento proporciona toda la información técnica necesaria para el mantenimiento, soporte y evolución del sistema CRM implementado en GYS. Incluye arquitectura, dependencias, procedimientos de deployment y troubleshooting.

---

## 🏗️ Arquitectura del Sistema

### 📊 Diagrama de Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes     │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js API)  │◄──►│   (PostgreSQL)  │
│                 │    │                  │    │                 │
│ • React Components│   │ • REST Endpoints │   │ • Prisma Models │
│ • TypeScript     │   │ • Data Validation│   │ • Migrations    │
│ • Tailwind CSS   │   │ • Error Handling │   │ • Indexes       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CRM Modules   │    │   Business Logic │    │   Data Layer    │
│                 │    │                  │    │                 │
│ • Oportunidades │    │ • Calculations   │    │ • CRUD Ops      │
│ • Actividades   │    │ • Validations    │    │ • Relationships │
│ • Competidores  │    │ • Integrations   │    │ • Queries       │
│ • Métricas      │    │ • Automations    │    │ • Aggregations  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 🗂️ Estructura de Archivos

```
src/
├── app/
│   ├── api/crm/                    # Endpoints CRM
│   │   ├── oportunidades/          # Gestión oportunidades
│   │   ├── actividades/            # Gestión actividades
│   │   ├── competidores/           # Gestión competidores
│   │   ├── clientes/               # Gestión clientes/contactos
│   │   ├── metricas/               # KPIs y métricas
│   │   └── dashboard/              # Dashboard data
│   └── comercial/crm/              # Páginas CRM
│       ├── oportunidades/          # CRUD oportunidades
│       ├── clientes/               # Gestión clientes
│       ├── actividades/            # Registro actividades
│       └── reportes/               # Reportes y análisis
├── components/crm/                 # Componentes React
│   ├── dashboard/                  # Dashboard components
│   ├── oportunidades/              # Opportunity components
│   ├── actividades/                # Activity components
│   ├── competidores/               # Competitor components
│   ├── contactos/                  # Contact components
│   └── shared/                     # Shared utilities
├── lib/
│   ├── services/crm/               # Business logic services
│   └── utils/crm-utils.ts          # CRM utilities
└── types/
    └── modelos.ts                  # TypeScript interfaces
```

---

## 🗄️ Modelo de Datos

### 📋 Entidades Principales

#### CrmOportunidad
```typescript
{
  id: string
  clienteId: string              // FK → Cliente
  nombre: string
  descripcion?: string
  valorEstimado?: number
  probabilidad: number            // 0-100
  fechaCierreEstimada?: string
  fuente?: string
  estado: EstadoOportunidad       // enum
  prioridad: string
  comercialId?: string            // FK → User
  responsableId?: string          // FK → User
  fechaUltimoContacto?: string
  notas?: string
  cotizacionId?: string           // FK → Cotizacion (único)
  proyectoId?: string             // FK → Proyecto (nuevo)
  createdAt: string
  updatedAt: string

  // Relaciones
  cliente: Cliente
  comercial?: User
  responsable?: User
  cotizacion?: Cotizacion
  proyecto?: Proyecto
  actividades: CrmActividad[]
}
```

#### CrmActividad
```typescript
{
  id: string
  oportunidadId: string           // FK → CrmOportunidad
  tipo: string                    // 'llamada', 'email', 'reunión', etc.
  descripcion: string
  fecha: string
  resultado?: string              // 'positivo', 'neutro', 'negativo'
  notas?: string
  usuarioId: string               // FK → User
  createdAt: string
  updatedAt: string

  // Relaciones
  oportunidad: CrmOportunidad
  usuario: User
}
```

#### CrmMetricaComercial
```typescript
{
  id: string
  usuarioId: string               // FK → User
  periodo: string                 // '2024-09', '2024-Q3', '2024'
  cotizacionesGeneradas: number
  cotizacionesAprobadas: number
  proyectosCerrados: number
  valorTotalVendido: number
  margenTotalObtenido: number
  tiempoPromedioCierre?: number
  tasaConversion?: number
  llamadasRealizadas: number
  reunionesAgendadas: number
  propuestasEnviadas: number
  emailsEnviados: number
  createdAt: string
  updatedAt: string

  // Relaciones
  usuario: User
}
```

### 🔗 Relaciones Clave

- **Oportunidad ↔ Cotización**: Una oportunidad puede tener una cotización asociada
- **Oportunidad ↔ Proyecto**: Una oportunidad puede tener un proyecto asociado (nuevo)
- **Cliente → Oportunidades**: Un cliente puede tener múltiples oportunidades
- **Usuario → Oportunidades**: Un comercial puede tener múltiples oportunidades asignadas
- **Oportunidad → Actividades**: Una oportunidad puede tener múltiples actividades

---

## 🔌 APIs y Endpoints

### 📊 Endpoints Principales

#### Oportunidades
```
GET    /api/crm/oportunidades           # Lista con filtros
POST   /api/crm/oportunidades           # Crear oportunidad
GET    /api/crm/oportunidades/[id]      # Detalles
PUT    /api/crm/oportunidades/[id]      # Actualizar
DELETE /api/crm/oportunidades/[id]      # Eliminar

POST   /api/crm/oportunidades/crear-desde-cotizacion  # Crear desde cotización
POST   /api/crm/oportunidades/crear-desde-proyecto    # Crear desde proyecto
```

#### Actividades
```
GET    /api/crm/oportunidades/[id]/actividades  # Lista actividades
POST   /api/crm/oportunidades/[id]/actividades  # Crear actividad
```

#### Métricas
```
GET    /api/crm/metricas                 # Métricas generales
GET    /api/crm/metricas/[usuarioId]     # Métricas por usuario
```

#### Dashboard
```
GET    /api/crm/dashboard                # Datos para dashboard
```

### 🔒 Autenticación y Autorización

- **Autenticación**: NextAuth.js con JWT
- **Roles**: colaborador, comercial, coordinador, gerente, admin
- **Permisos**:
  - **Lectura**: Todos los usuarios autenticados
  - **Escritura**: Según rol y asignación
  - **Eliminación**: Solo administradores o propietarios

---

## 🔧 Servicios y Utilidades

### 📋 Servicios Business Logic

#### oportunidades.ts
```typescript
export async function getOportunidades(params?: OportunidadFilters)
export async function createOportunidad(data: CreateOportunidadData)
export async function updateOportunidad(id: string, data: UpdateOportunidadData)
export async function getOportunidadesByCliente(clienteId: string)
export async function getOportunidadesByComercial(comercialId: string)
```

#### metricas.ts
```typescript
export async function calcularMetricasUsuario(usuarioId: string, periodo: string)
export async function actualizarMetricasUsuario(usuarioId: string, periodo: string)
export async function getMetricasPeriodo(periodo: string)
```

### 🛠️ Utilidades

#### crm-utils.ts
```typescript
export function calcularProbabilidad(oportunidad: CrmOportunidad): number
export function formatCurrency(amount: number): string
export function getEstadoColor(estado: EstadoOportunidad): string
export function validarOportunidad(data: any): ValidationResult
```

---

## 🚀 Deployment y Configuración

### 📋 Variables de Entorno

```bash
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/gys_crm"

# Autenticación
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"

# Aplicación
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 🔄 Script de Deployment

```bash
# scripts/deploy-production.sh
#!/bin/bash

# Verificar variables de entorno
# Instalar dependencias
# Ejecutar migraciones
# Generar cliente Prisma
# Migrar datos CRM
# Build de aplicación
# Crear configuración de producción
```

### 📊 Migración de Datos

**Script**: `scripts/migrate-crm-data.ts`

**Funciones**:
- Migrar clientes existentes con datos CRM
- Crear oportunidades desde cotizaciones activas
- Generar historial de proyectos
- Calcular métricas iniciales

**Ejecución**:
```bash
npx ts-node scripts/migrate-crm-data.ts
```

---

## 📊 Monitoreo y Métricas

### 🔍 Logs Importantes

- **API Logs**: Requests/responses en `/api/crm/*`
- **Database Logs**: Queries de Prisma
- **Error Logs**: Excepciones no manejadas
- **Performance Logs**: Queries lentas (>500ms)

### 📈 KPIs del Sistema

- **Performance**: Response time < 500ms
- **Availability**: Uptime > 99.5%
- **Data Integrity**: Validación automática
- **User Adoption**: % usuarios activos en CRM

### 🚨 Alertas Críticas

- Error rate > 5%
- Response time > 2s
- Database connection failures
- Memory usage > 80%

---

## 🐛 Troubleshooting

### 🔧 Problemas Comunes

#### 1. Error de Conexión a BD
```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Test connection
npx prisma db push --preview-feature
```

#### 2. Migraciones Pendientes
```bash
# Ver estado de migraciones
npx prisma migrate status

# Aplicar migraciones
npx prisma migrate deploy
```

#### 3. Cliente Prisma Desactualizado
```bash
# Regenerar cliente
npx prisma generate

# Reiniciar aplicación
npm run dev
```

#### 4. Permisos de Usuario
```bash
# Verificar rol en base de datos
npx prisma studio

# Actualizar permisos si es necesario
```

### 📞 Escalation Matrix

1. **Nivel 1**: Desarrollador asignado
2. **Nivel 2**: Tech Lead
3. **Nivel 3**: Equipo de desarrollo completo
4. **Nivel 4**: Proveedor externo si es necesario

---

## 🔄 Mantenimiento y Evolución

### 📅 Tareas de Mantenimiento

#### Diario
- [ ] Revisar logs de errores
- [ ] Verificar performance de queries
- [ ] Monitorear uso de recursos

#### Semanal
- [ ] Actualizar métricas comerciales
- [ ] Limpiar oportunidades obsoletas
- [ ] Verificar integridad de datos

#### Mensual
- [ ] Backup de base de datos
- [ ] Análisis de uso del sistema
- [ ] Planificación de mejoras

### 🚀 Plan de Evolución

#### Próximas Funcionalidades
- **Integración con calendario** (Google Calendar, Outlook)
- **Notificaciones push** para actividades pendientes
- **Análisis predictivo** de conversión
- **Integración con WhatsApp** para comunicaciones
- **Mobile App** nativa para comerciales

#### Mejoras Técnicas
- **API GraphQL** para consultas complejas
- **Cache Redis** para métricas
- **Real-time updates** con WebSockets
- **Microservicios** para módulos específicos

---

## 📚 Documentación Adicional

### 📋 Documentos de Referencia

- `docs/CRM_IMPLEMENTATION_SPECIFICATION.md` - Especificación completa
- `docs/GUIA_USUARIO_CRM.md` - Guía para usuarios finales
- `prisma/schema.prisma` - Esquema de base de datos
- `src/types/modelos.ts` - Interfaces TypeScript

### 🔗 Recursos Externos

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [CRM Best Practices](https://www.salesforce.com/resources/articles/what-is-crm/)

---

## 👥 Equipo y Contactos

### 👨‍💼 Desarrollo
- **Líder Técnico**: Jesús Artemio
- **Desarrollador Frontend**: Equipo de desarrollo
- **Desarrollador Backend**: Equipo de desarrollo

### 📞 Soporte
- **Primer Nivel**: Desarrollador asignado
- **Segundo Nivel**: Tech Lead
- **Tercer Nivel**: Equipo completo

### 📧 Contactos
- **Email**: soporte@gys.com
- **Slack**: #crm-support
- **Issues**: GitHub Issues

---

## ✅ Checklist de Entrega

### 🔧 Técnico
- [x] Código implementado y probado
- [x] Base de datos migrada
- [x] APIs documentadas
- [x] Tests unitarios
- [x] Scripts de deployment

### 📚 Documentación
- [x] Guía de usuario completa
- [x] Documentación técnica
- [x] Manual de mantenimiento
- [x] Troubleshooting guide

### 🎯 Funcional
- [x] Dashboard operativo
- [x] Gestión de oportunidades
- [x] Registro de actividades
- [x] Análisis de competidores
- [x] Reportes y métricas

### 🔗 Integración
- [x] Con sistema de cotizaciones
- [x] Con sistema de proyectos
- [x] Con gestión de clientes
- [x] Sincronización automática

---

*Fecha de entrega: Septiembre 2025*
*Versión: 1.0*
*Estado: ✅ Completo y operativo*