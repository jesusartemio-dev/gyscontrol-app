# 🛠️ Guía de Desarrollo Local

## Configuración Inicial

### 1. Variables de Entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus valores reales:

```env
# Para desarrollo local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-nextauth-secret-super-secreto-aqui

# Base de datos (ajusta según tu configuración)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Base de Datos

Asegúrate de tener PostgreSQL corriendo y crea la base de datos:

```bash
createdb gyscontrol_dev
```

### 4. Ejecutar Migraciones

```bash
npx prisma migrate dev
```

### 5. Ejecutar Servidor de Desarrollo

```bash
npm run dev
```

El servidor correrá en `http://localhost:3000`

## 🔐 Problemas Comunes con NextAuth

### Redirección automática a Vercel

Si al hacer login en desarrollo local te redirige a Vercel, verifica:

1. **NEXTAUTH_URL** debe ser `http://localhost:3000` (o tu puerto local)
2. **Reinicia el servidor** después de cambiar variables de entorno
3. **Limpia cookies** del navegador para `localhost:3000`

### Variables de Entorno por Entorno

- **Desarrollo**: `.env.local` → `NEXTAUTH_URL=http://localhost:3000`
- **Producción**: Vercel Environment Variables → `NEXTAUTH_URL=https://app.gyscontrol.com`

## 🗄️ Base de Datos

### Desarrollo Local
- Usa PostgreSQL local
- Ejecuta migraciones: `npx prisma migrate dev`
- Resetea datos: `npx prisma migrate reset`

### Producción
- Configura `DATABASE_URL` en Vercel
- Las migraciones se ejecutan automáticamente en deploy

## 🚀 Deploy

### Vercel
1. Push a `main` dispara deploy automático
2. Configura Environment Variables en Vercel Dashboard
3. Monitorea logs en Vercel Dashboard

### Variables de Producción
```env
NEXTAUTH_URL=https://app.gyscontrol.com
DATABASE_URL=tu-database-url-de-produccion
NEXTAUTH_SECRET=tu-secret-de-produccion
```

## 🐛 Debugging

### NextAuth Issues
- Activa `debug: true` en desarrollo
- Revisa Network tab en DevTools
- Verifica cookies en Application tab

### Database Issues
- `npx prisma studio` para ver datos
- `npx prisma generate` después de cambios en schema
- Logs de Prisma en consola

## 📝 Notas Importantes

- **Nunca commits `.env.local`** (está en `.gitignore`)
- **Reinicia servidor** después de cambiar variables de entorno
- **Limpia cookies** al cambiar entre entornos
- **Usa diferentes bases de datos** para dev/prod