# 🏗️ Sistema GYS - Gestión y Servicios

Sistema integral de gestión empresarial construido con **Next.js 14+**, **Prisma ORM** y **TypeScript**. Implementa el **flujo Database-First Consistency** para garantizar la consistencia entre la base de datos, APIs y componentes.

## 🚀 Inicio Rápido

### Instalación
```bash
# Instalar dependencias
npm install

# Configurar base de datos
npx prisma generate
npx prisma db push

# Configurar hooks de pre-commit
npm run prepare
```

### Desarrollo
```bash
# Servidor de desarrollo
npm run dev

# Auditoría de consistencia
npm run audit:consistency

# Generar tipos desde Prisma
npm run generate:types
```

Abre [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## 🔍 Database-First Consistency

### ¿Qué es?
Metodología que garantiza la **consistencia automática** entre:
- 🗄️ **Modelos Prisma** (fuente de verdad)
- 📡 **APIs y Endpoints**
- 🧩 **Componentes React**
- 🔍 **Validadores Zod**
- 📝 **Tipos TypeScript**

### Comandos de Auditoría
```bash
# Auditoría completa
npm run audit:consistency

# Reporte HTML detallado
npm run audit:consistency:html

# Auditoría + verificación de tipos
npm run db:audit

# Generar tipos automáticamente
npm run generate:types
```

### Pre-commit Hooks
Cada commit ejecuta automáticamente:
- ✅ Auditoría de consistencia
- ✅ Verificación de tipos TypeScript
- ❌ **Bloquea commits** si hay inconsistencias

### CI/CD Pipeline
GitHub Actions verifica:
- 🔍 Consistencia BD-API-Componentes
- 🧪 Tests unitarios e integración
- 📊 Reportes automáticos en PRs

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14+** con App Router
- **React 18+** con Server Components
- **TypeScript** para tipado estático
- **Tailwind CSS v4** + **shadcn/ui**
- **Framer Motion** para animaciones
- **React Hook Form** + **Zod** para formularios

### Backend
- **Next.js API Routes** (REST)
- **Prisma ORM** con PostgreSQL
- **NextAuth.js** para autenticación
- **Zod** para validación de datos

### DevOps & Testing
- **Vitest** + **Testing Library**
- **Playwright** para E2E
- **Husky** para pre-commit hooks
- **GitHub Actions** para CI/CD
- **ESLint** + **Prettier**

## 📁 Arquitectura del Proyecto

```
src/
├── app/                    # App Router (Next.js 14+)
│   ├── (admin)/           # Rutas de administración
│   ├── (comercial)/       # Módulo comercial
│   ├── (proyectos)/       # Gestión de proyectos
│   ├── (logistica)/       # Módulo logístico
│   └── api/               # Endpoints REST
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── comercial/        # Componentes comerciales
│   ├── proyectos/        # Componentes de proyectos
│   └── logistica/        # Componentes logísticos
├── lib/
│   ├── services/         # Lógica de negocio
│   ├── validators/       # Esquemas Zod
│   └── utils/           # Utilidades
├── types/                # Tipos TypeScript
└── scripts/             # Scripts de automatización
```

## 🔧 Scripts Disponibles

### Desarrollo
```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run lint             # Linting con ESLint
```

### Testing
```bash
npm run test             # Tests unitarios
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Cobertura de tests
npm run test:e2e         # Tests E2E con Playwright
```

### Base de Datos
```bash
npx prisma generate      # Generar cliente Prisma
npx prisma db push       # Aplicar cambios a BD
npx prisma studio        # Interfaz visual de BD
npx prisma migrate dev   # Crear migración
```

### Consistencia
```bash
npm run audit:consistency     # Auditoría completa
npm run generate:types        # Generar tipos desde Prisma
npm run db:audit             # Auditoría + type check
```

## 📚 Documentación

- 📋 [**Mejoras de Consistencia**](./docs/MEJORAS_PLAN_MAESTRO_CONSISTENCIA.md) - Metodología Database-First
- 🏗️ [**Estructura del Proyecto**](./doc/ESTRUCTURA_PROYECTO.md) - Arquitectura detallada
- 🔄 [**Flujo de Trabajo**](./doc/FLUJO_TRABAJO_GYS.md) - Guía de desarrollo
- 🧪 [**Testing**](./docs/TEST_README.md) - Estrategia de pruebas
- 🧭 [**Navegación**](./docs/NAVEGACION_MASTER_DETAIL.md) - Guía de UI/UX

## 🚨 Reglas de Oro

### Database-First Consistency
1. **Prisma es la fuente de verdad** - Todos los cambios inician en `schema.prisma`
2. **Auditoría antes de commit** - Los hooks bloquean commits inconsistentes
3. **Generación automática** - Usa `npm run generate:types` después de cambios en Prisma
4. **Validación en capas** - Zod en API, TypeScript en componentes
5. **Testing obligatorio** - Cobertura mínima del 80%

### Flujo de Desarrollo
1. 🗄️ **Modelo Prisma** → Definir entidad
2. 📝 **Types** → Generar automáticamente
3. 📡 **API** → Implementar CRUD
4. 🔍 **Servicios** → Lógica de negocio
5. 🧩 **Componentes** → UI/UX
6. 🧪 **Tests** → Cobertura completa

## 🤝 Contribuir

1. **Fork** el repositorio
2. **Crea** una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Ejecuta** auditoría (`npm run audit:consistency`)
4. **Commit** tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
5. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
6. **Abre** un Pull Request

### Antes de hacer commit:
- ✅ Ejecutar `npm run audit:consistency`
- ✅ Verificar `npm run type-check`
- ✅ Ejecutar tests `npm run test`
- ✅ Revisar linting `npm run lint`

---

**Desarrollado con ❤️ por el equipo GYS**  
**Arquitectura Database-First Consistency** 🏗️
