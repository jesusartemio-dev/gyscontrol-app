# 🚀 Guía de Deployment: Vercel + Neon

## Sistema GYS - Deployment a Producción

**Fecha:** Diciembre 2025
**Versión:** 1.0.0
**Stack:** Next.js 14 + PostgreSQL + Prisma + NextAuth.js

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Configuración de Neon (Base de Datos)](#configuración-de-neon-base-de-datos)
3. [Configuración de Vercel](#configuración-de-vercel)
4. [Variables de Entorno](#variables-de-entorno)
5. [Configuración del Proyecto](#configuración-del-proyecto)
6. [Deployment Inicial](#deployment-inicial)
7. [Configuración de Dominio](#configuración-de-dominio)
8. [Base de Datos en Producción](#base-de-datos-en-producción)
9. [Testing y Verificación](#testing-y-verificación)
10. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)
11. [Troubleshooting](#troubleshooting)
12. [Costo Estimado](#costo-estimado)

---

## 🔧 Prerrequisitos

### Cuentas Necesarias:
- ✅ **GitHub Account** (repositorio del proyecto)
- ✅ **Vercel Account** ([vercel.com](https://vercel.com))
- ✅ **Neon Account** ([neon.tech](https://neon.tech))

### Conocimientos Requeridos:
- ✅ **Git básico** (commits, push)
- ✅ **Command line básico**
- ✅ **Variables de entorno**

### Herramientas Locales:
```bash
# Verificar instalación
node --version      # v18.0.0 o superior
npm --version       # v8.0.0 o superior
git --version       # v2.0.0 o superior
```

---

## 🗄️ Configuración de Neon (Base de Datos)

### Paso 1: Crear cuenta en Neon
1. Ir a [neon.tech](https://neon.tech)
2. Registrarse con GitHub/Google
3. Verificar email

### Paso 2: Crear nuevo proyecto
```bash
# En el dashboard de Neon:
1. Click "Create a project"
2. Nombre: "gys-production"
3. Región: "US East (N. Virginia)" o la más cercana
4. PostgreSQL version: Latest
5. Click "Create project"
```

### Paso 3: Obtener connection string
```bash
# En el dashboard del proyecto:
1. Ir a "Connection Details"
2. Copiar "Connection string"
3. Formato esperado:
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### Paso 4: Configurar conexión segura
```sql
-- En Neon SQL Editor, ejecutar:
-- (Esto ya viene configurado por defecto en Neon)
SHOW ssl;
-- Debe mostrar: on
```

---

## 🚀 Configuración de Vercel

### Paso 1: Crear cuenta y conectar GitHub
```bash
# 1. Ir a vercel.com
# 2. Registrarse con GitHub
# 3. Autorizar acceso a repositorios
# 4. Verificar email
```

### Paso 2: Importar proyecto desde GitHub
```bash
# En Vercel Dashboard:
1. Click "Add New..." > "Project"
2. Buscar y seleccionar tu repositorio "gyscontrol-app"
3. Click "Import"
```

### Paso 3: Configurar build settings
```bash
# Vercel detectará automáticamente Next.js
# Verificar configuración:

Framework Preset: Next.js
Root Directory: ./ (raíz del proyecto)
Build Command: npm run build
Output Directory: .next (automático)
Install Command: npm install
```

---

## 🔐 Variables de Entorno

### Archivo `.env.local` (desarrollo local)
```env
# Base de datos
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-super-seguro-aqui"

# Google OAuth (opcional)
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# JWT Secret adicional
JWT_SECRET="otro-secret-para-jwt"
```

### Variables en Vercel (producción)
```bash
# En Vercel Dashboard > Project Settings > Environment Variables:

# 1. DATABASE_URL
Key: DATABASE_URL
Value: postgresql://[tu-connection-string-de-neon]
Environment: Production, Preview, Development

# 2. NEXTAUTH_URL
Key: NEXTAUTH_URL
Value: https://tu-dominio.vercel.app
Environment: Production

# 3. NEXTAUTH_SECRET
Key: NEXTAUTH_SECRET
Value: [generar-secret-seguro]
Environment: Production, Preview, Development

# 4. NEXTAUTH_URL (desarrollo)
Key: NEXTAUTH_URL
Value: https://tu-proyecto.vercel.app
Environment: Preview

# 5. JWT_SECRET
Key: JWT_SECRET
Value: [otro-secret-seguro]
Environment: Production, Preview, Development
```

### Generar secrets seguros:
```bash
# En terminal:
openssl rand -base64 32
# Copiar el output como valor para NEXTAUTH_SECRET y JWT_SECRET
```

---

## ⚙️ Configuración del Proyecto

### Paso 1: Actualizar `package.json`
```json
{
  "name": "gys-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postbuild": "prisma db push --accept-data-loss"
  },
  "dependencies": {
    // ... tus dependencias existentes
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Paso 2: Configurar `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL") // Para migrations
}
```

### Paso 3: Crear archivo `vercel.json` (opcional)
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 🚀 Deployment Inicial

### Paso 1: Commit y push a GitHub
```bash
# En tu terminal local:
git add .
git commit -m "feat: prepare for production deployment"
git push origin main
```

### Paso 2: Trigger deployment en Vercel
```bash
# Vercel detectará automáticamente el push
# Ver progreso en: vercel.com > tu-proyecto > Deployments

# Estados esperados:
# 1. Building... (compilando)
# 2. Deploying... (desplegando)
# 3. Ready! (listo)
```

### Paso 3: Verificar deployment
```bash
# En Vercel Dashboard:
1. Ir a "Deployments"
2. Click en el deployment más reciente
3. Ver "Functions" tab para verificar APIs
4. Ver "Domains" para URL de producción
```

---

## 🌐 Configuración de Dominio

### Opción 1: Subdominio Vercel (.vercel.app)
```bash
# Automático - Vercel asigna automáticamente:
# https://gyscontrol-app-[hash].vercel.app

# Para cambiar nombre:
1. Ir a Project Settings > Domains
2. Click "Edit" en el dominio actual
3. Cambiar a nombre deseado (ej: gys-app.vercel.app)
```

### Opción 2: Dominio Personalizado
```bash
# 1. Comprar dominio (Namecheap, GoDaddy, etc.)
# 2. En Vercel: Project Settings > Domains > Add
# 3. Ingresar tu dominio: gys.com o app.gys.com
# 4. Vercel mostrará records DNS a configurar
# 5. Configurar en tu proveedor de dominio:
#    - Type: CNAME
#    - Name: www (o @ para root)
#    - Value: cname.vercel-dns.com
```

### Opción 3: Subdirectorio (/app)
```bash
# Si tienes sitio principal en otro lugar:
# Configurar en Vercel para que deploy en /app
# URL final: https://tudominio.com/app
```

---

## 🗄️ Base de Datos en Producción

### Paso 1: Ejecutar migrations en Neon
```bash
# Opción A: Desde Vercel (recomendado)
# En Build Settings, agregar:
Build Command: npx prisma generate && npx prisma db push && next build

# Opción B: Manual desde terminal
npx prisma db push --schema=./prisma/schema.prisma

# Opción C: Desde Neon SQL Editor
# Copiar contenido de prisma/migrations y ejecutar
```

### Paso 2: Seed de datos iniciales
```bash
# Si tienes seed script:
npx prisma db seed

# O ejecutar manualmente en Neon SQL Editor
```

### Paso 3: Verificar conexión
```typescript
// Crear endpoint de test: src/app/api/test-db/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.count()
    return NextResponse.json({
      status: 'connected',
      userCount: users,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 })
  }
}
```

### Paso 4: Backup y monitoreo
```bash
# En Neon Dashboard:
1. Ir a "Backups"
2. Configurar backup automático diario
3. Ver métricas de uso
4. Configurar alertas de uso alto
```

---

## ✅ Testing y Verificación

### Checklist de Verificación:

#### 🔍 Funcionalidades Críticas:
- [ ] Login/Registro funciona
- [ ] Dashboard carga correctamente
- [ ] CRUD de clientes funciona
- [ ] Crear cotizaciones funciona
- [ ] Reportes se generan
- [ ] APIs responden correctamente

#### 🔒 Seguridad:
- [ ] HTTPS funciona (candado verde)
- [ ] Autenticación requerida
- [ ] Roles y permisos funcionan
- [ ] Datos sensibles no se exponen

#### ⚡ Performance:
- [ ] Primera carga < 3 segundos
- [ ] Navegación fluida
- [ ] Imágenes se cargan correctamente
- [ ] APIs responden en < 1 segundo

### Testing Automatizado:
```bash
# Ejecutar tests antes de deploy:
npm run test
npm run test:e2e  # si tienes tests end-to-end

# Vercel puede ejecutar tests automáticamente en CI/CD
```

---

## 📊 Monitoreo y Mantenimiento

### Vercel Analytics (Gratuito):
```bash
# En Vercel Dashboard:
1. Ir a "Analytics" tab
2. Ver métricas de:
   - Page views
   - Unique visitors
   - Performance metrics
   - Error rates
```

### Logs y Debugging:
```bash
# En Vercel Dashboard:
1. Ir a "Functions" tab
2. Ver logs de funciones serverless
3. Buscar errores específicos
4. Ver tiempos de respuesta
```

### Monitoreo de Base de Datos:
```bash
# En Neon Dashboard:
1. Ver "Monitoring" tab
2. Métricas de:
   - CPU usage
   - Memory usage
   - Connection count
   - Query performance
```

### Alertas y Notificaciones:
```bash
# Configurar en Vercel:
1. Project Settings > Notifications
2. Alertas para:
   - Deployment failures
   - Function timeouts
   - Error rates > 5%
```

---

## 🔧 Troubleshooting

### Problema: Build falla en Vercel
```bash
# Solución:
1. Ver logs en Vercel Dashboard > Deployments
2. Común: Falta de dependencias o variables de entorno
3. Verificar: package.json scripts y variables de entorno
```

### Problema: Base de datos no conecta
```bash
# Solución:
1. Verificar DATABASE_URL en Environment Variables
2. Asegurar que Neon permite conexiones desde Vercel IPs
3. Verificar SSL mode=require en connection string
```

### Problema: Funciones serverless timeout
```bash
# Solución:
1. Aumentar timeout en vercel.json
2. Optimizar queries de base de datos
3. Usar streaming para respuestas grandes
```

### Problema: Memoria insuficiente
```bash
# Solución:
1. Upgrade a plan Pro en Vercel
2. Optimizar imágenes y assets
3. Implementar caching (Redis)
```

### Problema: CORS errors
```bash
# Solución:
1. Configurar CORS en next.config.js
2. Verificar origins permitidos
3. Usar middleware para CORS
```

---

## 💰 Costo Estimado

### Costos Mensuales (Estimado):

#### 🚀 Vercel:
- **Hobby Plan**: $0/mes (hasta 100GB bandwidth)
- **Pro Plan**: $20/mes (recomendado para producción)
  - 1000GB bandwidth
  - 3000 functions
  - Analytics avanzado

#### 🗄️ Neon:
- **Free Tier**: $0/mes (0.5GB storage)
- **Pro Plan**: $15-50/mes (dependiendo del uso)
  - Hasta 10GB storage
  - Backups automáticos
  - Connection pooling

#### 📧 Email (opcional):
- **Resend**: $0-20/mes (para envío de cotizaciones)

#### 🔍 Monitoring (opcional):
- **Sentry**: $0-26/mes (error tracking)

### **Total Estimado: $20-100/mes**

---

## 🎯 Próximos Pasos

### Inmediato (Esta semana):
1. ✅ Crear cuentas Vercel y Neon
2. ✅ Configurar base de datos
3. ✅ Primer deployment de prueba
4. ✅ Verificar funcionalidades críticas

### Corto Plazo (1-2 semanas):
1. ✅ Configurar dominio personalizado
2. ✅ Implementar monitoreo básico
3. ✅ Testing exhaustivo
4. ✅ Documentación para usuarios

### Largo Plazo (1 mes):
1. ✅ Optimizaciones de performance
2. ✅ Backup strategy avanzado
3. ✅ CI/CD pipeline completo
4. ✅ Multi-environment setup (staging/production)

---

## 📞 Soporte y Contacto

### Recursos de Ayuda:
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

### Issues Comunes:
- **Deployment lento**: Verificar build cache
- **DB connections**: Verificar connection limits
- **Cold starts**: Usar regions más cercanas

### Contacto para soporte:
- **Vercel Support**: support@vercel.com
- **Neon Support**: support@neon.tech

---

**¡Tu aplicación GYS está lista para conquistar el mundo! 🚀**

*Guía creada: Diciembre 2025*
*Última actualización: Diciembre 2025*