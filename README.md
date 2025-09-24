# 🏢 Sistema GYS - Gestión y Servicios

Sistema integral de gestión empresarial desarrollado con **Next.js 14+** y **TypeScript**, diseñado para optimizar procesos comerciales, de proyectos y logística.

## 🚀 Características Principales

### 📊 Módulos del Sistema
- **Comercial**: Gestión de clientes, cotizaciones y oportunidades
- **Proyectos**: Planificación, seguimiento y control de proyectos
- **Logística**: Aprovisionamiento, pedidos y gestión de equipos
- **Catálogo**: Gestión de productos, servicios y plantillas
- **Finanzas**: Control financiero y reportes

### 🎯 Funcionalidades Clave
- ✅ **Gestión de Cotizaciones** con generación automática de códigos
- ✅ **Sistema de Proyectos** con EDT y cronogramas
- ✅ **Aprovisionamiento Inteligente** con comparación de proveedores
- ✅ **Catálogo Unificado** de equipos y servicios
- ✅ **Dashboard Analytics** con KPIs en tiempo real
- ✅ **Sistema de Roles** y permisos granulares
- ✅ **Generación de PDFs** profesionales
- ✅ **Importación/Exportación** de datos Excel

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14+** con App Router
- **React 18+** con Server Components
- **TypeScript** estricto
- **Tailwind CSS v4** + **shadcn/ui**
- **Framer Motion** para animaciones
- **Lucide React** para iconografía

### Backend
- **Next.js API Routes**
- **Prisma ORM** + **PostgreSQL**
- **NextAuth.js** para autenticación
- **Zod** para validación de datos

### Testing & Quality
- **Jest** + **React Testing Library**
- **Playwright** para E2E
- **ESLint** + **Prettier**
- **Husky** para pre-commit hooks

## 📦 Instalación

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### Configuración Inicial

1. **Clonar el repositorio**
```bash
git clone https://github.com/artemiogeek/gyscontrol-app.git
cd gyscontrol-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Configurar las siguientes variables:
```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/gys_db"

# NextAuth
NEXTAUTH_SECRET="tu-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Opcional: Códigos personalizados
CLIENT_CODE="CLI"
COTIZACION_CODE="GYS"
```

4. **Configurar base de datos**
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Poblar datos iniciales (opcional)
npx prisma db seed
```

5. **Iniciar desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🧪 Testing

### Ejecutar Tests
```bash
# Tests unitarios (cliente)
npm run test:client

# Tests de servicios (servidor)
npm run test:server

# Tests E2E
npm run test:e2e

# Cobertura completa
npm run test:coverage
```

### Estándares de Testing
- **Client Tests**: React Testing Library para componentes cliente
- **Server Tests**: Jest puro para servicios y APIs
- **E2E Tests**: Playwright para flujos completos
- **Cobertura mínima**: 90% statements, 85% branches

## 🏗️ Arquitectura

### Estructura del Proyecto
```
src/
├── app/                 # App Router (Next.js 14+)
│   ├── (comercial)/     # Grupo de rutas comerciales
│   ├── (proyectos)/     # Grupo de rutas de proyectos
│   ├── (logistica)/     # Grupo de rutas logísticas
│   └── api/             # API Routes
├── components/          # Componentes React
│   ├── ui/              # Componentes base (shadcn/ui)
│   ├── comercial/       # Componentes comerciales
│   ├── proyectos/       # Componentes de proyectos
│   └── logistica/       # Componentes logísticos
├── lib/
│   ├── services/        # Lógica de negocio
│   ├── validators/      # Esquemas Zod
│   └── utils/           # Utilidades
└── types/               # Definiciones TypeScript
```

### Flujo de Desarrollo (FLUJO_GYS)
1. **Modelo Prisma** → Definir entidad
2. **Types** → Modelos y payloads TypeScript
3. **API** → Rutas CRUD
4. **Servicios** → Lógica de negocio
5. **Componentes** → UI/UX
6. **Páginas** → Integración final
7. **Tests** → Cobertura completa

## 🎨 Guía de Estilo

### Componentes UI
- **Responsive Design** con Tailwind CSS
- **Dark/Light Mode** automático
- **Animaciones fluidas** con Framer Motion
- **Accesibilidad** WCAG 2.1 AA
- **Loading States** y **Error Boundaries**

### Patrones de Código
- **Server Components** por defecto
- **Client Components** solo para interactividad
- **Custom Hooks** para lógica reutilizable
- **Compound Components** para UI compleja

## 🔐 Seguridad

### Autenticación y Autorización
- **NextAuth.js** con múltiples proveedores
- **Roles granulares**: Admin, Gerente, Comercial, Proyectos, Logística
- **Middleware de autorización** en rutas protegidas
- **Validación de datos** con Zod en cliente y servidor

### Mejores Prácticas
- ✅ Validación de entrada en todas las APIs
- ✅ Sanitización de datos SQL injection-proof
- ✅ Rate limiting en endpoints críticos
- ✅ Logs de auditoría para acciones sensibles
- ✅ Encriptación de datos sensibles

## 📈 Performance

### Optimizaciones Implementadas
- **Server Components** para mejor SEO
- **Lazy Loading** de componentes pesados
- **Image Optimization** automática
- **Bundle Splitting** inteligente
- **Caching** estratégico con SWR

### Métricas Objetivo
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3s

## 🚀 Deployment

### Vercel (Recomendado)
```bash
# Conectar con Vercel
npx vercel

# Configurar variables de entorno en Vercel Dashboard
# Desplegar
npx vercel --prod
```

### Docker
```bash
# Construir imagen
docker build -t gys-app .

# Ejecutar contenedor
docker run -p 3000:3000 gys-app
```

## 📚 Documentación Adicional

### 🏗️ Arquitectura
- [Arquitectura del Sistema](./docs/architecture/ARQUITECTURA_GYS.md)
- [Flujo de Trabajo GYS](./docs/architecture/FLUJO_TRABAJO_COMPLETO_GYS.md)
- [Implementación Cronograma](./docs/architecture/Implementacion-Cronograma-Comercial-Opcion-A.md)

### 🧪 Testing
- [Guía de Testing](./docs/testing/TESTING.md)
- [Reportes de Performance](./docs/testing/PERFORMANCE_REPORT.md)

### 🚀 Deployment
- [Guía de Deployment Vercel/Neon](./docs/deployment/DEPLOYMENT_GUIDE_VERCEL_NEON.md)
- [Checklist de Producción](./docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md)

### 📋 Procedimientos
- [Procedimiento Tareas/Subtareas](./docs/procedures/PROCEDIMIENTO_TAREAS_SUBTAREAS.md)
- [Procedimiento Cronograma](./docs/procedures/PROCEDIMIENTO-IMPLEMENTACION-CRONOGRAMA-COMERCIAL.md)

## 🤝 Contribución

### Proceso de Desarrollo
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'feat: nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Convenciones
- **Commits**: Conventional Commits (feat, fix, docs, etc.)
- **Branches**: feature/, bugfix/, hotfix/
- **Code Style**: ESLint + Prettier automático
- **Tests**: Obligatorios para nuevas funcionalidades

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

## 👥 Equipo

Desarrollado con ❤️ por el equipo GYS

---

**¿Necesitas ayuda?** Abre un [issue](https://github.com/artemiogeek/gyscontrol-app/issues) o contacta al equipo de desarrollo.
