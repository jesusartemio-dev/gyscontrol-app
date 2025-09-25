#!/bin/bash

# ===================================================
# 📁 Archivo: deploy-production.sh
# 📌 Ubicación: scripts/
# 🔧 Descripción: Script de despliegue para producción
# ✅ Build, migración y despliegue del sistema CRM
# ===================================================

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue a producción del sistema GYS con CRM..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes coloreados
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar variables de entorno
print_status "Verificando variables de entorno..."
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL no está configurada"
    exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    print_error "NEXTAUTH_SECRET no está configurada"
    exit 1
fi

if [ -z "$NEXTAUTH_URL" ]; then
    print_warning "NEXTAUTH_URL no está configurada, usando localhost por defecto"
    export NEXTAUTH_URL="http://localhost:3000"
fi

print_success "Variables de entorno verificadas"

# Instalar dependencias
print_status "Instalando dependencias..."
npm ci --production=false
print_success "Dependencias instaladas"

# Ejecutar migraciones de base de datos
print_status "Ejecutando migraciones de base de datos..."
npx prisma migrate deploy
print_success "Migraciones ejecutadas"

# Generar cliente Prisma
print_status "Generando cliente Prisma..."
npx prisma generate
print_success "Cliente Prisma generado"

# Ejecutar migración de datos CRM
print_status "Ejecutando migración de datos CRM..."
npx ts-node scripts/migrate-crm-data.ts
print_success "Migración de datos CRM completada"

# Build de la aplicación
print_status "Construyendo aplicación..."
npm run build
print_success "Build completado"

# Verificar que el build fue exitoso
if [ ! -d ".next" ]; then
    print_error "El directorio .next no existe. El build falló."
    exit 1
fi

print_success "Build verificado exitosamente"

# Crear archivo de configuración de producción
print_status "Creando configuración de producción..."
cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
DATABASE_URL=$DATABASE_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=$NEXTAUTH_URL

# Additional production settings
NEXT_PUBLIC_APP_URL=$NEXTAUTH_URL
EOF

print_success "Configuración de producción creada"

# Ejecutar tests si existen
if [ -d "__tests__" ]; then
    print_status "Ejecutando tests..."
    npm test -- --watchAll=false --passWithNoTests
    print_success "Tests ejecutados"
else
    print_warning "No se encontraron tests para ejecutar"
fi

# Crear backup de base de datos antes del despliegue
print_status "Creando backup de base de datos..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

# Comando para backup depende del tipo de base de datos
if [[ $DATABASE_URL == postgresql://* ]]; then
    # PostgreSQL backup
    pg_dump $DATABASE_URL > $BACKUP_FILE 2>/dev/null || print_warning "No se pudo crear backup automático de PostgreSQL"
else
    print_warning "Tipo de base de datos no reconocido para backup automático"
fi

if [ -f "$BACKUP_FILE" ]; then
    print_success "Backup creado: $BACKUP_FILE"
else
    print_warning "No se pudo crear backup automático"
fi

print_success "✅ DESPLIEGUE A PRODUCCIÓN COMPLETADO EXITOSAMENTE"

echo ""
echo "🎉 Resumen del despliegue:"
echo "  ✅ Dependencias instaladas"
echo "  ✅ Migraciones de BD ejecutadas"
echo "  ✅ Cliente Prisma generado"
echo "  ✅ Datos CRM migrados"
echo "  ✅ Build completado"
echo "  ✅ Configuración de producción creada"
echo ""

if [ -f "$BACKUP_FILE" ]; then
    echo "  📦 Backup disponible: $BACKUP_FILE"
fi

echo ""
echo "🚀 La aplicación está lista para ser desplegada en el servidor de producción"
echo "💡 Recomendaciones:"
echo "  - Verificar logs de la aplicación después del despliegue"
echo "  - Monitorear rendimiento durante las primeras horas"
echo "  - Ejecutar pruebas de usuario con el equipo comercial"
echo ""

# Opcional: Preguntar si quiere iniciar el servidor
read -p "¿Desea iniciar el servidor en modo producción? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Iniciando servidor en modo producción..."
    npm start
fi