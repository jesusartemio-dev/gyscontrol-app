-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- CreateEnum
CREATE TYPE "EstadoActividad" AS ENUM ('pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('borrador', 'enviada', 'aprobada', 'rechazada');

-- CreateEnum
CREATE TYPE "EstadoFase" AS ENUM ('planificado', 'en_progreso', 'completado', 'pausado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoOportunidad" AS ENUM ('prospecto', 'contacto_inicial', 'propuesta_enviada', 'negociacion', 'cerrada_ganada', 'cerrada_perdida');

-- CreateEnum
CREATE TYPE "PlantillaTipo" AS ENUM ('completa', 'equipos', 'servicios', 'gastos');

-- CreateEnum
CREATE TYPE "PrioridadNotificacion" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "TipoExcepcion" AS ENUM ('feriado', 'dia_laboral_extra', 'dia_no_laboral');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('info', 'warning', 'success', 'error');

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoListaEquipo_new" AS ENUM ('borrador', 'enviada', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobada', 'rechazada', 'completada');
ALTER TABLE "ListaEquipo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "ListaEquipo" ALTER COLUMN "estado" TYPE "EstadoListaEquipo_new" USING ("estado"::text::"EstadoListaEquipo_new");
ALTER TYPE "EstadoListaEquipo" RENAME TO "EstadoListaEquipo_old";
ALTER TYPE "EstadoListaEquipo_new" RENAME TO "EstadoListaEquipo";
DROP TYPE "EstadoListaEquipo_old";
ALTER TABLE "ListaEquipo" ALTER COLUMN "estado" SET DEFAULT 'borrador';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ProyectoEstado_new" AS ENUM ('creado', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados', 'en_ejecucion', 'completado', 'pausado', 'cancelado', 'en_planificacion');
ALTER TABLE "Proyecto" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Proyecto" ALTER COLUMN "estado" TYPE "ProyectoEstado_new" USING ("estado"::text::"ProyectoEstado_new");
ALTER TYPE "ProyectoEstado" RENAME TO "ProyectoEstado_old";
ALTER TYPE "ProyectoEstado_new" RENAME TO "ProyectoEstado";
DROP TYPE "ProyectoEstado_old";
ALTER TABLE "Proyecto" ALTER COLUMN "estado" SET DEFAULT 'en_ejecucion';
COMMIT;

-- AlterEnum
ALTER TYPE "EstadoEdt" ADD VALUE 'pausado';

-- DropForeignKey
ALTER TABLE "cotizacion_edt" DROP CONSTRAINT "cotizacion_edt_cotizacionServicioId_fkey";

-- DropForeignKey
ALTER TABLE "cotizacion_tarea" DROP CONSTRAINT "cotizacion_tarea_cotizacionEdtId_fkey";

-- DropForeignKey
ALTER TABLE "ListaEquipoItem" DROP CONSTRAINT "ListaEquipoItem_proyectoEquipoId_fkey";

-- DropForeignKey
ALTER TABLE "ListaEquipoItem" DROP CONSTRAINT "ListaEquipoItem_proyectoEquipoItemId_fkey";

-- DropForeignKey
ALTER TABLE "ListaEquipoItem" DROP CONSTRAINT "ListaEquipoItem_reemplazaProyectoEquipoItemId_fkey";

-- DropForeignKey
ALTER TABLE "RegistroHoras" DROP CONSTRAINT "RegistroHoras_proyectoServicioId_fkey";

-- DropForeignKey
ALTER TABLE "tareas" DROP CONSTRAINT "tareas_proyectoServicioId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipo" DROP CONSTRAINT "ProyectoEquipo_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipo" DROP CONSTRAINT "ProyectoEquipo_responsableId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipoItem" DROP CONSTRAINT "ProyectoEquipoItem_catalogoEquipoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipoItem" DROP CONSTRAINT "ProyectoEquipoItem_listaEquipoSeleccionadoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipoItem" DROP CONSTRAINT "ProyectoEquipoItem_listaId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoEquipoItem" DROP CONSTRAINT "ProyectoEquipoItem_proyectoEquipoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoGasto" DROP CONSTRAINT "ProyectoGasto_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoGastoItem" DROP CONSTRAINT "ProyectoGastoItem_gastoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoServicio" DROP CONSTRAINT "ProyectoServicio_proyectoId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoServicio" DROP CONSTRAINT "ProyectoServicio_responsableId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoServicioItem" DROP CONSTRAINT "ProyectoServicioItem_catalogoServicioId_fkey";

-- DropForeignKey
ALTER TABLE "ProyectoServicioItem" DROP CONSTRAINT "ProyectoServicioItem_proyectoServicioId_fkey";

-- DropIndex
DROP INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_zona_idx";

-- DropIndex
DROP INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_zona_key";

-- DropIndex
DROP INDEX "cotizacion_tarea_cotizacionEdtId_estado_idx";

-- DropIndex
DROP INDEX "proyecto_edt_proyectoId_categoriaServicioId_zona_idx";

-- DropIndex
DROP INDEX "proyecto_edt_proyectoId_categoriaServicioId_zona_key";

-- DropIndex
DROP INDEX "RegistroHoras_proyectoEdtId_fechaTrabajo_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "metaMensual" DOUBLE PRECISION,
ADD COLUMN     "metaTrimestral" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "calificacionSatisfaccion" INTEGER DEFAULT 3,
ADD COLUMN     "frecuenciaCompraMeses" INTEGER;

-- AlterTable
ALTER TABLE "CategoriaEquipo" ADD COLUMN     "descripcion" TEXT;

-- AlterTable
ALTER TABLE "CategoriaServicio" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "faseDefaultId" TEXT;

-- AlterTable
ALTER TABLE "Plantilla" ADD COLUMN     "tipo" "PlantillaTipo" NOT NULL DEFAULT 'completa';

-- AlterTable
ALTER TABLE "Cotizacion" DROP COLUMN "etapa",
DROP COLUMN "etapaCrm",
ADD COLUMN     "calendarioLaboralId" TEXT,
ADD COLUMN     "fechaFin" TIMESTAMP(3),
ADD COLUMN     "fechaInicio" TIMESTAMP(3),
DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoCotizacion" NOT NULL DEFAULT 'borrador';

-- AlterTable
ALTER TABLE "cotizacion_edt" DROP COLUMN "zona",
ADD COLUMN     "cotizacionFaseId" TEXT,
ADD COLUMN     "nombre" TEXT NOT NULL,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "cotizacionServicioId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cotizacion_tarea" DROP COLUMN "cotizacionEdtId",
ADD COLUMN     "cotizacionActividadId" TEXT NOT NULL,
ADD COLUMN     "duracionHoras" DECIMAL(10,2),
ADD COLUMN     "esHito" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "progresoGeneral" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "proyecto_edt" ADD COLUMN     "nombre" TEXT NOT NULL,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proyectoCronogramaId" TEXT NOT NULL,
ADD COLUMN     "proyectoFaseId" TEXT;

-- AlterTable
ALTER TABLE "ListaEquipoItem" DROP COLUMN "reemplazaProyectoEquipoItemId",
ADD COLUMN     "reemplazaProyectoEquipoCotizadoItemId" TEXT;

-- AlterTable
ALTER TABLE "RegistroHoras" ADD COLUMN     "proyectoTareaId" TEXT;

-- AlterTable
ALTER TABLE "crm_oportunidad" ADD COLUMN     "proyectoId" TEXT,
DROP COLUMN "estado",
ADD COLUMN     "estado" "EstadoOportunidad" NOT NULL DEFAULT 'prospecto';

-- DropTable
DROP TABLE "ProyectoEquipo";

-- DropTable
DROP TABLE "ProyectoEquipoItem";

-- DropTable
DROP TABLE "ProyectoGasto";

-- DropTable
DROP TABLE "ProyectoGastoItem";

-- DropTable
DROP TABLE "ProyectoServicio";

-- DropTable
DROP TABLE "ProyectoServicioItem";

-- CreateTable
CREATE TABLE "ProyectoEquipoCotizado" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoEquipoCotizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoEquipoCotizadoItem" (
    "id" TEXT NOT NULL,
    "proyectoEquipoId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT,
    "listaId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'SIN-CATEGORIA',
    "unidad" TEXT NOT NULL,
    "marca" TEXT NOT NULL DEFAULT 'SIN-MARCA',
    "precioInterno" DOUBLE PRECISION NOT NULL,
    "precioCliente" DOUBLE PRECISION NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "precioReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidadReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempoEntrega" INTEGER,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "estado" "EstadoEquipoItem" NOT NULL DEFAULT 'pendiente',
    "motivoCambio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaEquipoSeleccionadoId" TEXT,

    CONSTRAINT "ProyectoEquipoCotizadoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoGastoCotizado" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoGastoCotizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoGastoCotizadoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoGastoCotizadoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoServicioCotizado" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoServicioCotizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoServicioCotizadoItem" (
    "id" TEXT NOT NULL,
    "proyectoServicioId" TEXT NOT NULL,
    "catalogoServicioId" TEXT,
    "categoria" TEXT NOT NULL,
    "costoHoraInterno" DOUBLE PRECISION NOT NULL,
    "costoHoraCliente" DOUBLE PRECISION NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidadHoras" INTEGER NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasEjecutadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "motivoCambio" TEXT,
    "nuevo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoServicioCotizadoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "label" TEXT,
    "value" DOUBLE PRECISION,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cambios" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendario_laboral" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "pais" TEXT,
    "empresa" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "horasPorDia" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "diasLaborables" "DiaSemana"[],
    "horaInicioManana" TEXT NOT NULL DEFAULT '08:00',
    "horaFinManana" TEXT NOT NULL DEFAULT '12:00',
    "horaInicioTarde" TEXT NOT NULL DEFAULT '13:00',
    "horaFinTarde" TEXT NOT NULL DEFAULT '17:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendario_laboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_calendario" (
    "id" TEXT NOT NULL,
    "calendarioLaboralId" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "calendarioPredeterminado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "configuracion_calendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_actividad" (
    "id" TEXT NOT NULL,
    "cotizacionEdtId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaInicioComercial" TIMESTAMP(3),
    "fechaFinComercial" TIMESTAMP(3),
    "estado" "EstadoActividad" NOT NULL DEFAULT 'pendiente',
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "horasEstimadas" DECIMAL(10,2),
    "descripcion" TEXT,
    "prioridad" "PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_dependencias_tarea" (
    "id" TEXT NOT NULL,
    "tareaOrigenId" TEXT NOT NULL,
    "tareaDependienteId" TEXT NOT NULL,
    "tipo" "TipoDependencia" NOT NULL DEFAULT 'finish_to_start',
    "lagMinutos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_dependencias_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_fase" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaInicioPlan" TIMESTAMP(3),
    "fechaFinPlan" TIMESTAMP(3),
    "estado" "EstadoFase" NOT NULL DEFAULT 'planificado',
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "horasEstimadas" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_plantilla_import" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "tipoImportacion" TEXT NOT NULL,
    "fechaImportacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "cotizacion_plantilla_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dia_calendario" (
    "id" TEXT NOT NULL,
    "calendarioLaboralId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "esLaborable" BOOLEAN NOT NULL DEFAULT true,
    "horaInicioManana" TEXT,
    "horaFinManana" TEXT,
    "horaInicioTarde" TEXT,
    "horaFinTarde" TEXT,
    "horasTotales" DOUBLE PRECISION,

    CONSTRAINT "dia_calendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excepcion_calendario" (
    "id" TEXT NOT NULL,
    "calendarioLaboralId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoExcepcion" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "horasTotales" DOUBLE PRECISION,

    CONSTRAINT "excepcion_calendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fase_default" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "duracionDias" INTEGER NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fase_default_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrica_comercial" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cotizacionesGeneradas" INTEGER NOT NULL DEFAULT 0,
    "cotizacionesAprobadas" INTEGER NOT NULL DEFAULT 0,
    "proyectosCerrados" INTEGER NOT NULL DEFAULT 0,
    "valorTotalVendido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margenTotalObtenido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempoPromedioCierre" DOUBLE PRECISION,
    "tasaConversion" DOUBLE PRECISION,
    "valorPromedioProyecto" DOUBLE PRECISION,
    "llamadasRealizadas" INTEGER NOT NULL DEFAULT 0,
    "reunionesAgendadas" INTEGER NOT NULL DEFAULT 0,
    "propuestasEnviadas" INTEGER NOT NULL DEFAULT 0,
    "emailsEnviados" INTEGER NOT NULL DEFAULT 0,
    "oportunidadesCreadas" INTEGER NOT NULL DEFAULT 0,
    "oportunidadesGanadas" INTEGER NOT NULL DEFAULT 0,
    "oportunidadesPerdidas" INTEGER NOT NULL DEFAULT 0,
    "actividadesRealizadas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrica_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL DEFAULT 'info',
    "prioridad" "PrioridadNotificacion" NOT NULL DEFAULT 'media',
    "usuarioId" TEXT NOT NULL,
    "entidadTipo" TEXT,
    "entidadId" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fechaLectura" TIMESTAMP(3),
    "accionUrl" TEXT,
    "accionTexto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isSystemPermission" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_duracion_cronograma" (
    "id" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "duracionDias" DOUBLE PRECISION NOT NULL,
    "horasPorDia" INTEGER NOT NULL DEFAULT 8,
    "bufferPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_duracion_cronograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_equipo_independiente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_equipo_independiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_equipo_item_independiente" (
    "id" TEXT NOT NULL,
    "plantillaEquipoId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "precioInterno" DOUBLE PRECISION NOT NULL,
    "precioCliente" DOUBLE PRECISION NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_equipo_item_independiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_gasto_independiente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_gasto_independiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_gasto_item_independiente" (
    "id" TEXT NOT NULL,
    "plantillaGastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_gasto_item_independiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_servicio_independiente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_servicio_independiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_servicio_item_independiente" (
    "id" TEXT NOT NULL,
    "plantillaServicioId" TEXT NOT NULL,
    "catalogoServicioId" TEXT,
    "unidadServicioId" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidadServicioNombre" TEXT NOT NULL,
    "recursoNombre" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "horaBase" DOUBLE PRECISION,
    "horaRepetido" DOUBLE PRECISION,
    "horaUnidad" DOUBLE PRECISION,
    "horaFijo" DOUBLE PRECISION,
    "costoHora" DOUBLE PRECISION NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "horaTotal" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_servicio_item_independiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_actividad" (
    "id" TEXT NOT NULL,
    "proyectoEdtId" TEXT NOT NULL,
    "proyectoCronogramaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "responsableId" TEXT,
    "fechaInicioPlan" TIMESTAMP(3) NOT NULL,
    "fechaFinPlan" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "EstadoActividad" NOT NULL DEFAULT 'pendiente',
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "horasPlan" DECIMAL(10,2),
    "horasReales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "prioridad" "PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_cronograma" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "copiadoDesdeCotizacionId" TEXT,
    "esBaseline" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_cronograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_dependencias_tarea" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDependencia" NOT NULL DEFAULT 'finish_to_start',
    "tareaOrigenId" TEXT NOT NULL,
    "tareaDependienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_dependencias_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_fase" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "proyectoCronogramaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaInicioPlan" TIMESTAMP(3),
    "fechaFinPlan" TIMESTAMP(3),
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "EstadoFase" NOT NULL DEFAULT 'planificado',
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_subtarea" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "porcentajeCompletado" INTEGER NOT NULL DEFAULT 0,
    "horasEstimadas" DECIMAL(10,2),
    "horasReales" DECIMAL(10,2) DEFAULT 0,
    "proyectoTareaId" TEXT NOT NULL,
    "asignadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_subtarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_tarea" (
    "id" TEXT NOT NULL,
    "proyectoEdtId" TEXT NOT NULL,
    "proyectoCronogramaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "horasEstimadas" DECIMAL(10,2),
    "horasReales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'media',
    "porcentajeCompletado" INTEGER NOT NULL DEFAULT 0,
    "dependenciaId" TEXT,
    "responsableId" TEXT,
    "proyectoActividadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_category_event_timestamp_idx" ON "analytics_events"("category", "event", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_timestamp_idx" ON "analytics_events"("sessionId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_timestamp_idx" ON "analytics_events"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_userId_timestamp_idx" ON "analytics_events"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_log_accion_createdAt_idx" ON "audit_log"("accion", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_entidadTipo_entidadId_createdAt_idx" ON "audit_log"("entidadTipo", "entidadId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_usuarioId_createdAt_idx" ON "audit_log"("usuarioId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "calendario_laboral_nombre_key" ON "calendario_laboral"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_calendario_entidadTipo_entidadId_key" ON "configuracion_calendario"("entidadTipo", "entidadId");

-- CreateIndex
CREATE INDEX "cotizacion_actividad_cotizacionEdtId_orden_idx" ON "cotizacion_actividad"("cotizacionEdtId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_dependencias_tarea_tareaOrigenId_tareaDependient_key" ON "cotizacion_dependencias_tarea"("tareaOrigenId", "tareaDependienteId");

-- CreateIndex
CREATE INDEX "cotizacion_fase_cotizacionId_orden_idx" ON "cotizacion_fase"("cotizacionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_fase_cotizacionId_nombre_key" ON "cotizacion_fase"("cotizacionId", "nombre");

-- CreateIndex
CREATE INDEX "cotizacion_plantilla_import_cotizacionId_fechaImportacion_idx" ON "cotizacion_plantilla_import"("cotizacionId", "fechaImportacion");

-- CreateIndex
CREATE INDEX "cotizacion_plantilla_import_plantillaId_tipoImportacion_idx" ON "cotizacion_plantilla_import"("plantillaId", "tipoImportacion");

-- CreateIndex
CREATE UNIQUE INDEX "dia_calendario_calendarioLaboralId_diaSemana_key" ON "dia_calendario"("calendarioLaboralId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "excepcion_calendario_calendarioLaboralId_fecha_key" ON "excepcion_calendario"("calendarioLaboralId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "fase_default_nombre_key" ON "fase_default"("nombre");

-- CreateIndex
CREATE INDEX "fase_default_activo_idx" ON "fase_default"("activo");

-- CreateIndex
CREATE INDEX "fase_default_orden_idx" ON "fase_default"("orden");

-- CreateIndex
CREATE INDEX "metrica_comercial_periodo_tipo_idx" ON "metrica_comercial"("periodo", "tipo");

-- CreateIndex
CREATE INDEX "metrica_comercial_usuarioId_tipo_idx" ON "metrica_comercial"("usuarioId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "metrica_comercial_usuarioId_periodo_tipo_key" ON "metrica_comercial"("usuarioId", "periodo", "tipo");

-- CreateIndex
CREATE INDEX "notificaciones_entidadTipo_entidadId_idx" ON "notificaciones"("entidadTipo", "entidadId");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_leida_createdAt_idx" ON "notificaciones"("usuarioId", "leida", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_resource_action_idx" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "plantilla_duracion_cronograma_nivel_key" ON "plantilla_duracion_cronograma"("nivel");

-- CreateIndex
CREATE INDEX "proyecto_actividad_proyectoEdtId_proyectoCronogramaId_idx" ON "proyecto_actividad"("proyectoEdtId", "proyectoCronogramaId");

-- CreateIndex
CREATE INDEX "proyecto_actividad_proyectoEdtId_proyectoCronogramaId_orden_idx" ON "proyecto_actividad"("proyectoEdtId", "proyectoCronogramaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_cronograma_copiadoDesdeCotizacionId_key" ON "proyecto_cronograma"("copiadoDesdeCotizacionId");

-- CreateIndex
CREATE INDEX "proyecto_cronograma_proyectoId_tipo_idx" ON "proyecto_cronograma"("proyectoId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_cronograma_proyectoId_tipo_key" ON "proyecto_cronograma"("proyectoId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_dependencias_tarea_tareaOrigenId_tareaDependienteI_key" ON "proyecto_dependencias_tarea"("tareaOrigenId", "tareaDependienteId");

-- CreateIndex
CREATE INDEX "proyecto_fase_proyectoId_proyectoCronogramaId_orden_idx" ON "proyecto_fase"("proyectoId", "proyectoCronogramaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_fase_proyectoId_proyectoCronogramaId_nombre_key" ON "proyecto_fase"("proyectoId", "proyectoCronogramaId", "nombre");

-- CreateIndex
CREATE INDEX "proyecto_tarea_dependenciaId_idx" ON "proyecto_tarea"("dependenciaId");

-- CreateIndex
CREATE INDEX "proyecto_tarea_proyectoActividadId_idx" ON "proyecto_tarea"("proyectoActividadId");

-- CreateIndex
CREATE INDEX "proyecto_tarea_proyectoActividadId_orden_idx" ON "proyecto_tarea"("proyectoActividadId", "orden");

-- CreateIndex
CREATE INDEX "proyecto_tarea_proyectoEdtId_estado_idx" ON "proyecto_tarea"("proyectoEdtId", "estado");

-- CreateIndex
CREATE INDEX "proyecto_tarea_proyectoEdtId_orden_idx" ON "proyecto_tarea"("proyectoEdtId", "orden");

-- CreateIndex
CREATE INDEX "proyecto_tarea_responsableId_fechaFin_idx" ON "proyecto_tarea"("responsableId", "fechaFin");

-- CreateIndex
CREATE INDEX "user_permissions_permissionId_idx" ON "user_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "user_permissions_userId_idx" ON "user_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_permissionId_key" ON "user_permissions"("userId", "permissionId");

-- CreateIndex
CREATE INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_idx" ON "cotizacion_edt"("cotizacionId", "cotizacionServicioId");

-- CreateIndex
CREATE INDEX "cotizacion_edt_cotizacionId_orden_idx" ON "cotizacion_edt"("cotizacionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_edt_cotizacionId_nombre_key" ON "cotizacion_edt"("cotizacionId", "nombre");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_cotizacionActividadId_estado_idx" ON "cotizacion_tarea"("cotizacionActividadId", "estado");

-- CreateIndex
CREATE INDEX "proyecto_edt_proyectoId_proyectoCronogramaId_categoriaServi_idx" ON "proyecto_edt"("proyectoId", "proyectoCronogramaId", "categoriaServicioId", "zona");

-- CreateIndex
CREATE INDEX "proyecto_edt_proyectoId_proyectoCronogramaId_orden_idx" ON "proyecto_edt"("proyectoId", "proyectoCronogramaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_edt_proyectoId_proyectoCronogramaId_categoriaServi_key" ON "proyecto_edt"("proyectoId", "proyectoCronogramaId", "categoriaServicioId", "zona");

-- CreateIndex
CREATE INDEX "RegistroHoras_proyectoEdtId_proyectoTareaId_fechaTrabajo_idx" ON "RegistroHoras"("proyectoEdtId", "proyectoTareaId", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_proyectoTareaId_fechaTrabajo_idx" ON "RegistroHoras"("proyectoTareaId", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "crm_oportunidad_clienteId_estado_idx" ON "crm_oportunidad"("clienteId", "estado");

-- AddForeignKey
ALTER TABLE "CategoriaServicio" ADD CONSTRAINT "CategoriaServicio_faseDefaultId_fkey" FOREIGN KEY ("faseDefaultId") REFERENCES "fase_default"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "calendario_laboral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionFaseId_fkey" FOREIGN KEY ("cotizacionFaseId") REFERENCES "cotizacion_fase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "CotizacionServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_cotizacionActividadId_fkey" FOREIGN KEY ("cotizacionActividadId") REFERENCES "cotizacion_actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_proyectoCronogramaId_fkey" FOREIGN KEY ("proyectoCronogramaId") REFERENCES "proyecto_cronograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_proyectoFaseId_fkey" FOREIGN KEY ("proyectoFaseId") REFERENCES "proyecto_fase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipoCotizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "ProyectoEquipoCotizadoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_reemplazaProyectoEquipoCotizadoItemId_fkey" FOREIGN KEY ("reemplazaProyectoEquipoCotizadoItemId") REFERENCES "ProyectoEquipoCotizadoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicioCotizado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoTareaId_fkey" FOREIGN KEY ("proyectoTareaId") REFERENCES "proyecto_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicioCotizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoCotizado" ADD CONSTRAINT "ProyectoEquipoCotizado_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoCotizado" ADD CONSTRAINT "ProyectoEquipoCotizado_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoCotizadoItem" ADD CONSTRAINT "ProyectoEquipoCotizadoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoCotizadoItem" ADD CONSTRAINT "ProyectoEquipoCotizadoItem_listaEquipoSeleccionadoId_fkey" FOREIGN KEY ("listaEquipoSeleccionadoId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoCotizadoItem" ADD CONSTRAINT "ProyectoEquipoCotizadoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoCotizadoItem" ADD CONSTRAINT "ProyectoEquipoCotizadoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipoCotizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGastoCotizado" ADD CONSTRAINT "ProyectoGastoCotizado_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGastoCotizadoItem" ADD CONSTRAINT "ProyectoGastoCotizadoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "ProyectoGastoCotizado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioCotizado" ADD CONSTRAINT "ProyectoServicioCotizado_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioCotizado" ADD CONSTRAINT "ProyectoServicioCotizado_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioCotizadoItem" ADD CONSTRAINT "ProyectoServicioCotizadoItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioCotizadoItem" ADD CONSTRAINT "ProyectoServicioCotizadoItem_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicioCotizado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_calendario" ADD CONSTRAINT "configuracion_calendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "calendario_laboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_actividad" ADD CONSTRAINT "cotizacion_actividad_cotizacionEdtId_fkey" FOREIGN KEY ("cotizacionEdtId") REFERENCES "cotizacion_edt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_dependencias_tarea" ADD CONSTRAINT "cotizacion_dependencias_tarea_tareaDependienteId_fkey" FOREIGN KEY ("tareaDependienteId") REFERENCES "cotizacion_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_dependencias_tarea" ADD CONSTRAINT "cotizacion_dependencias_tarea_tareaOrigenId_fkey" FOREIGN KEY ("tareaOrigenId") REFERENCES "cotizacion_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_fase" ADD CONSTRAINT "cotizacion_fase_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_plantilla_import" ADD CONSTRAINT "cotizacion_plantilla_import_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_plantilla_import" ADD CONSTRAINT "cotizacion_plantilla_import_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_plantilla_import" ADD CONSTRAINT "cotizacion_plantilla_import_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dia_calendario" ADD CONSTRAINT "dia_calendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "calendario_laboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excepcion_calendario" ADD CONSTRAINT "excepcion_calendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "calendario_laboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrica_comercial" ADD CONSTRAINT "metrica_comercial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_equipo_item_independiente" ADD CONSTRAINT "plantilla_equipo_item_independiente_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_equipo_item_independiente" ADD CONSTRAINT "plantilla_equipo_item_independiente_plantillaEquipoId_fkey" FOREIGN KEY ("plantillaEquipoId") REFERENCES "plantilla_equipo_independiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_gasto_item_independiente" ADD CONSTRAINT "plantilla_gasto_item_independiente_plantillaGastoId_fkey" FOREIGN KEY ("plantillaGastoId") REFERENCES "plantilla_gasto_independiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_servicio_item_independiente" ADD CONSTRAINT "plantilla_servicio_item_independiente_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_servicio_item_independiente" ADD CONSTRAINT "plantilla_servicio_item_independiente_plantillaServicioId_fkey" FOREIGN KEY ("plantillaServicioId") REFERENCES "plantilla_servicio_independiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_servicio_item_independiente" ADD CONSTRAINT "plantilla_servicio_item_independiente_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_servicio_item_independiente" ADD CONSTRAINT "plantilla_servicio_item_independiente_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_actividad" ADD CONSTRAINT "proyecto_actividad_proyectoCronogramaId_fkey" FOREIGN KEY ("proyectoCronogramaId") REFERENCES "proyecto_cronograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_actividad" ADD CONSTRAINT "proyecto_actividad_proyectoEdtId_fkey" FOREIGN KEY ("proyectoEdtId") REFERENCES "proyecto_edt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_actividad" ADD CONSTRAINT "proyecto_actividad_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_cronograma" ADD CONSTRAINT "proyecto_cronograma_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_dependencias_tarea" ADD CONSTRAINT "proyecto_dependencias_tarea_tareaDependienteId_fkey" FOREIGN KEY ("tareaDependienteId") REFERENCES "proyecto_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_dependencias_tarea" ADD CONSTRAINT "proyecto_dependencias_tarea_tareaOrigenId_fkey" FOREIGN KEY ("tareaOrigenId") REFERENCES "proyecto_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_fase" ADD CONSTRAINT "proyecto_fase_proyectoCronogramaId_fkey" FOREIGN KEY ("proyectoCronogramaId") REFERENCES "proyecto_cronograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_fase" ADD CONSTRAINT "proyecto_fase_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_subtarea" ADD CONSTRAINT "proyecto_subtarea_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_subtarea" ADD CONSTRAINT "proyecto_subtarea_proyectoTareaId_fkey" FOREIGN KEY ("proyectoTareaId") REFERENCES "proyecto_tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea" ADD CONSTRAINT "proyecto_tarea_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "proyecto_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea" ADD CONSTRAINT "proyecto_tarea_proyectoActividadId_fkey" FOREIGN KEY ("proyectoActividadId") REFERENCES "proyecto_actividad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea" ADD CONSTRAINT "proyecto_tarea_proyectoCronogramaId_fkey" FOREIGN KEY ("proyectoCronogramaId") REFERENCES "proyecto_cronograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea" ADD CONSTRAINT "proyecto_tarea_proyectoEdtId_fkey" FOREIGN KEY ("proyectoEdtId") REFERENCES "proyecto_edt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tarea" ADD CONSTRAINT "proyecto_tarea_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

