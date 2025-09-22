-- CreateEnum
CREATE TYPE "public"."EstadoEquipo" AS ENUM ('pendiente', 'revisado_tecnico', 'aprobado_coordinador', 'aprobado_gestor', 'en_lista', 'comprado', 'reemplazado', 'entregado');

-- CreateEnum
CREATE TYPE "public"."EstadoEquipoItem" AS ENUM ('pendiente', 'en_lista', 'reemplazado', 'descartado');

-- CreateEnum
CREATE TYPE "public"."EstadoListaItem" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "public"."OrigenListaItem" AS ENUM ('cotizado', 'nuevo', 'reemplazo');

-- CreateEnum
CREATE TYPE "public"."EstadoListaEquipo" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "public"."EstadoPedido" AS ENUM ('borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "public"."EstadoPedidoItem" AS ENUM ('pendiente', 'atendido', 'parcial', 'entregado');

-- CreateEnum
CREATE TYPE "public"."EstadoEntregaItem" AS ENUM ('pendiente', 'en_proceso', 'parcial', 'entregado', 'retrasado', 'cancelado');

-- CreateEnum
CREATE TYPE "public"."EstadoCotizacionProveedor" AS ENUM ('pendiente', 'solicitado', 'cotizado', 'rechazado', 'seleccionado');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('colaborador', 'comercial', 'presupuestos', 'proyectos', 'coordinador', 'logistico', 'gestor', 'gerente', 'admin');

-- CreateEnum
CREATE TYPE "public"."ProyectoEstado" AS ENUM ('en_planificacion', 'en_ejecucion', 'en_pausa', 'cerrado', 'cancelado');

-- CreateEnum
CREATE TYPE "public"."EstadoEdt" AS ENUM ('planificado', 'en_progreso', 'detenido', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "public"."PrioridadEdt" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "public"."OrigenTrabajo" AS ENUM ('oficina', 'campo');

-- CreateEnum
CREATE TYPE "public"."EstadoTarea" AS ENUM ('pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada');

-- CreateEnum
CREATE TYPE "public"."PrioridadTarea" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "public"."TipoDependencia" AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'colaborador',
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Cliente" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER DEFAULT 1,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UnidadServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoriaEquipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoriaServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recurso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costoHora" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CatalogoEquipo" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "precioInterno" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL,
    "precioReal" DOUBLE PRECISION,
    "fechaActualizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CatalogoServicio" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "unidadServicioId" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "horaBase" DOUBLE PRECISION,
    "horaRepetido" DOUBLE PRECISION,
    "horaUnidad" DOUBLE PRECISION,
    "horaFijo" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Plantilla" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEquiposCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlantillaEquipo" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlantillaEquipoItem" (
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

    CONSTRAINT "PlantillaEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlantillaServicio" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlantillaServicioItem" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlantillaGasto" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlantillaGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
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

    CONSTRAINT "PlantillaGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cotizacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "comercialId" TEXT,
    "plantillaId" TEXT,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEquiposCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "etapa" TEXT NOT NULL DEFAULT 'nuevo',
    "prioridad" TEXT,
    "probabilidad" INTEGER,
    "fechaEnvio" TIMESTAMP(3),
    "fechaCierreEstimada" TIMESTAMP(3),
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionEquipo" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionEquipoItem" (
    "id" TEXT NOT NULL,
    "cotizacionEquipoId" TEXT NOT NULL,
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

    CONSTRAINT "CotizacionEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionServicio" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionServicioItem" (
    "id" TEXT NOT NULL,
    "cotizacionServicioId" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionGasto" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
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

    CONSTRAINT "CotizacionGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cotizacion_edt" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "cotizacionServicioId" TEXT NOT NULL,
    "categoriaServicioId" TEXT,
    "zona" TEXT,
    "fechaInicioComercial" TIMESTAMP(3),
    "fechaFinComercial" TIMESTAMP(3),
    "horasEstimadas" DECIMAL(10,2) DEFAULT 0,
    "estado" "public"."EstadoEdt" NOT NULL DEFAULT 'planificado',
    "responsableId" TEXT,
    "descripcion" TEXT,
    "prioridad" "public"."PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_edt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cotizacion_tarea" (
    "id" TEXT NOT NULL,
    "cotizacionEdtId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horasEstimadas" DECIMAL(10,2),
    "estado" "public"."EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "public"."PrioridadTarea" NOT NULL DEFAULT 'media',
    "dependenciaId" TEXT,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proyecto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "comercialId" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "cotizacionId" TEXT,
    "nombre" TEXT NOT NULL,
    "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codigo" TEXT NOT NULL,
    "estado" "public"."ProyectoEstado" NOT NULL DEFAULT 'en_ejecucion',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "totalRealEquipos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRealServicios" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRealGastos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proyecto_edt" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "categoriaServicioId" TEXT NOT NULL,
    "zona" TEXT,
    "fechaInicioPlan" TIMESTAMP(3),
    "fechaFinPlan" TIMESTAMP(3),
    "horasPlan" DECIMAL(10,2) DEFAULT 0,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "horasReales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "public"."EstadoEdt" NOT NULL DEFAULT 'planificado',
    "responsableId" TEXT,
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "prioridad" "public"."PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_edt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProyectoEquipo" (
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

    CONSTRAINT "ProyectoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProyectoEquipoItem" (
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
    "estado" "public"."EstadoEquipoItem" NOT NULL DEFAULT 'pendiente',
    "motivoCambio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaEquipoSeleccionadoId" TEXT,

    CONSTRAINT "ProyectoEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProyectoServicio" (
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

    CONSTRAINT "ProyectoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProyectoServicioItem" (
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

    CONSTRAINT "ProyectoServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProyectoGasto" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProyectoGastoItem" (
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

    CONSTRAINT "ProyectoGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ListaEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "estado" "public"."EstadoListaEquipo" NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "responsableId" TEXT NOT NULL,
    "fechaAprobacionFinal" TIMESTAMP(3),
    "fechaAprobacionRevision" TIMESTAMP(3),
    "fechaEnvioLogistica" TIMESTAMP(3),
    "fechaEnvioRevision" TIMESTAMP(3),
    "fechaFinCotizacion" TIMESTAMP(3),
    "fechaInicioCotizacion" TIMESTAMP(3),
    "fechaNecesaria" TIMESTAMP(3),
    "fechaValidacion" TIMESTAMP(3),

    CONSTRAINT "ListaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ListaEquipoItem" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "proyectoEquipoId" TEXT,
    "proyectoEquipoItemId" TEXT,
    "proveedorId" TEXT,
    "cotizacionSeleccionadaId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "comentarioRevision" TEXT,
    "presupuesto" DOUBLE PRECISION,
    "precioElegido" DOUBLE PRECISION,
    "costoElegido" DOUBLE PRECISION,
    "costoPedido" DOUBLE PRECISION DEFAULT 0,
    "costoReal" DOUBLE PRECISION DEFAULT 0,
    "cantidadPedida" DOUBLE PRECISION DEFAULT 0,
    "cantidadEntregada" DOUBLE PRECISION DEFAULT 0,
    "estado" "public"."EstadoListaItem" NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "origen" "public"."OrigenListaItem" NOT NULL DEFAULT 'nuevo',
    "reemplazaProyectoEquipoItemId" TEXT,
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "responsableId" TEXT NOT NULL,

    CONSTRAINT "ListaEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionProveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estado" "public"."EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "CotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CotizacionProveedorItem" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidadOriginal" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "cantidad" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "estado" "public"."EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',
    "esSeleccionada" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaId" TEXT,

    CONSTRAINT "CotizacionProveedorItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PedidoEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "listaId" TEXT,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "estado" "public"."EstadoPedido" NOT NULL DEFAULT 'borrador',
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fechaNecesaria" TIMESTAMP(3) NOT NULL,
    "costoRealTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esUrgente" BOOLEAN NOT NULL DEFAULT false,
    "presupuestoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prioridad" TEXT DEFAULT 'media',

    CONSTRAINT "PedidoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PedidoEquipoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT,
    "cantidadPedida" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "estado" "public"."EstadoPedidoItem" NOT NULL DEFAULT 'pendiente',
    "cantidadAtendida" DOUBLE PRECISION,
    "comentarioLogistica" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "unidad" TEXT NOT NULL,
    "fechaOrdenCompraRecomendada" TIMESTAMP(3),
    "responsableId" TEXT NOT NULL,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "estadoEntrega" "public"."EstadoEntregaItem" NOT NULL DEFAULT 'pendiente',
    "observacionesEntrega" TEXT,

    CONSTRAINT "PedidoEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Valorizacion" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Valorizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegistroHoras" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "proyectoServicioId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombreServicio" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "recursoNombre" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fechaTrabajo" TIMESTAMP(3) NOT NULL,
    "horasTrabajadas" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "proyectoEdtId" TEXT,
    "categoriaServicioId" TEXT,
    "origen" "public"."OrigenTrabajo",
    "ubicacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroHoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tareas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "public"."EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "public"."PrioridadTarea" NOT NULL DEFAULT 'media',
    "porcentajeCompletado" INTEGER NOT NULL DEFAULT 0,
    "horasEstimadas" DECIMAL(10,2),
    "horasReales" DECIMAL(10,2) DEFAULT 0,
    "proyectoServicioId" TEXT NOT NULL,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subtareas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "public"."EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "porcentajeCompletado" INTEGER NOT NULL DEFAULT 0,
    "horasEstimadas" DECIMAL(10,2),
    "horasReales" DECIMAL(10,2) DEFAULT 0,
    "tareaId" TEXT NOT NULL,
    "asignadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dependencias_tarea" (
    "id" TEXT NOT NULL,
    "tipo" "public"."TipoDependencia" NOT NULL DEFAULT 'finish_to_start',
    "tareaOrigenId" TEXT NOT NULL,
    "tareaDependienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependencias_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asignaciones_recurso" (
    "id" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "horasAsignadas" DECIMAL(10,2),
    "tareaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaciones_recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."registros_progreso" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horasTrabajadas" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "porcentajeCompletado" INTEGER,
    "tareaId" TEXT,
    "subtareaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_progreso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "public"."Cliente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_nombre_key" ON "public"."Unidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadServicio_nombre_key" ON "public"."UnidadServicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaEquipo_nombre_key" ON "public"."CategoriaEquipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaServicio_nombre_key" ON "public"."CategoriaServicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Recurso_nombre_key" ON "public"."Recurso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoEquipo_codigo_key" ON "public"."CatalogoEquipo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_codigo_key" ON "public"."Cotizacion"("codigo");

-- CreateIndex
CREATE INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_zona_idx" ON "public"."cotizacion_edt"("cotizacionId", "cotizacionServicioId", "zona");

-- CreateIndex
CREATE INDEX "cotizacion_edt_estado_fechaFinComercial_idx" ON "public"."cotizacion_edt"("estado", "fechaFinComercial");

-- CreateIndex
CREATE INDEX "cotizacion_edt_responsableId_estado_idx" ON "public"."cotizacion_edt"("responsableId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_zona_key" ON "public"."cotizacion_edt"("cotizacionId", "cotizacionServicioId", "zona");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_cotizacionEdtId_estado_idx" ON "public"."cotizacion_tarea"("cotizacionEdtId", "estado");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_responsableId_fechaFin_idx" ON "public"."cotizacion_tarea"("responsableId", "fechaFin");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_dependenciaId_idx" ON "public"."cotizacion_tarea"("dependenciaId");

-- CreateIndex
CREATE INDEX "idx_proyecto_estado_inicio_fecha" ON "public"."Proyecto"("estado", "fechaInicio", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_proyecto_comercial_estado_inicio" ON "public"."Proyecto"("comercialId", "estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "idx_proyecto_gestor_estado_fin" ON "public"."Proyecto"("gestorId", "estado", "fechaFin");

-- CreateIndex
CREATE INDEX "idx_proyecto_cliente_estado_fecha" ON "public"."Proyecto"("clienteId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "proyecto_edt_proyectoId_categoriaServicioId_zona_idx" ON "public"."proyecto_edt"("proyectoId", "categoriaServicioId", "zona");

-- CreateIndex
CREATE INDEX "proyecto_edt_estado_fechaFinPlan_idx" ON "public"."proyecto_edt"("estado", "fechaFinPlan");

-- CreateIndex
CREATE INDEX "proyecto_edt_responsableId_estado_idx" ON "public"."proyecto_edt"("responsableId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_edt_proyectoId_categoriaServicioId_zona_key" ON "public"."proyecto_edt"("proyectoId", "categoriaServicioId", "zona");

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipo_codigo_key" ON "public"."ListaEquipo"("codigo");

-- CreateIndex
CREATE INDEX "idx_lista_proyecto_estado_fecha" ON "public"."ListaEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_responsable_estado_aprobacion" ON "public"."ListaEquipo"("responsableId", "estado", "fechaAprobacionFinal");

-- CreateIndex
CREATE INDEX "idx_lista_estado_necesaria_fecha" ON "public"."ListaEquipo"("estado", "fechaNecesaria", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipoItem_cotizacionSeleccionadaId_key" ON "public"."ListaEquipoItem"("cotizacionSeleccionadaId");

-- CreateIndex
CREATE INDEX "idx_lista_item_lista_estado_fecha" ON "public"."ListaEquipoItem"("listaId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_item_responsable_estado_verificado" ON "public"."ListaEquipoItem"("responsableId", "estado", "verificado");

-- CreateIndex
CREATE INDEX "idx_lista_item_proveedor_estado_precio" ON "public"."ListaEquipoItem"("proveedorId", "estado", "precioElegido");

-- CreateIndex
CREATE UNIQUE INDEX "CotizacionProveedor_codigo_key" ON "public"."CotizacionProveedor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoEquipo_codigo_key" ON "public"."PedidoEquipo"("codigo");

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_estado_fecha" ON "public"."PedidoEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_responsable_estado_fecha" ON "public"."PedidoEquipo"("responsableId", "estado", "fechaNecesaria");

-- CreateIndex
CREATE INDEX "idx_pedido_estado_prioridad_fecha" ON "public"."PedidoEquipo"("estado", "prioridad", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_responsable_estado" ON "public"."PedidoEquipo"("proyectoId", "responsableId", "estado");

-- CreateIndex
CREATE INDEX "RegistroHoras_proyectoEdtId_fechaTrabajo_idx" ON "public"."RegistroHoras"("proyectoEdtId", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_categoriaServicioId_fechaTrabajo_idx" ON "public"."RegistroHoras"("categoriaServicioId", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_origen_fechaTrabajo_idx" ON "public"."RegistroHoras"("origen", "fechaTrabajo");

-- CreateIndex
CREATE UNIQUE INDEX "dependencias_tarea_tareaOrigenId_tareaDependienteId_key" ON "public"."dependencias_tarea"("tareaOrigenId", "tareaDependienteId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_recurso_tareaId_usuarioId_key" ON "public"."asignaciones_recurso"("tareaId", "usuarioId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CatalogoEquipo" ADD CONSTRAINT "CatalogoEquipo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."CategoriaEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CatalogoEquipo" ADD CONSTRAINT "CatalogoEquipo_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "public"."Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "public"."CategoriaServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "public"."Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "public"."UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaEquipo" ADD CONSTRAINT "PlantillaEquipo_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "public"."Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaEquipoItem" ADD CONSTRAINT "PlantillaEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "public"."CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaEquipoItem" ADD CONSTRAINT "PlantillaEquipoItem_plantillaEquipoId_fkey" FOREIGN KEY ("plantillaEquipoId") REFERENCES "public"."PlantillaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaServicio" ADD CONSTRAINT "PlantillaServicio_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "public"."Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "public"."CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_plantillaServicioId_fkey" FOREIGN KEY ("plantillaServicioId") REFERENCES "public"."PlantillaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "public"."Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "public"."UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaGasto" ADD CONSTRAINT "PlantillaGasto_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "public"."Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlantillaGastoItem" ADD CONSTRAINT "PlantillaGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "public"."PlantillaGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cotizacion" ADD CONSTRAINT "Cotizacion_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cotizacion" ADD CONSTRAINT "Cotizacion_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "public"."Plantilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionEquipo" ADD CONSTRAINT "CotizacionEquipo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionEquipoItem" ADD CONSTRAINT "CotizacionEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "public"."CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionEquipoItem" ADD CONSTRAINT "CotizacionEquipoItem_cotizacionEquipoId_fkey" FOREIGN KEY ("cotizacionEquipoId") REFERENCES "public"."CotizacionEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionServicio" ADD CONSTRAINT "CotizacionServicio_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "public"."CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "public"."CotizacionServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "public"."Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "public"."UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionGasto" ADD CONSTRAINT "CotizacionGasto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionGastoItem" ADD CONSTRAINT "CotizacionGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "public"."CotizacionGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "public"."CotizacionServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "public"."CategoriaServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_cotizacionEdtId_fkey" FOREIGN KEY ("cotizacionEdtId") REFERENCES "public"."cotizacion_edt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "public"."cotizacion_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proyecto" ADD CONSTRAINT "Proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proyecto" ADD CONSTRAINT "Proyecto_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proyecto" ADD CONSTRAINT "Proyecto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proyecto" ADD CONSTRAINT "Proyecto_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proyecto_edt" ADD CONSTRAINT "proyecto_edt_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proyecto_edt" ADD CONSTRAINT "proyecto_edt_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "public"."CategoriaServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proyecto_edt" ADD CONSTRAINT "proyecto_edt_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoEquipo" ADD CONSTRAINT "ProyectoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoEquipo" ADD CONSTRAINT "ProyectoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "public"."CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_listaEquipoSeleccionadoId_fkey" FOREIGN KEY ("listaEquipoSeleccionadoId") REFERENCES "public"."ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "public"."ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "public"."ProyectoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoServicio" ADD CONSTRAINT "ProyectoServicio_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoServicio" ADD CONSTRAINT "ProyectoServicio_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoServicioItem" ADD CONSTRAINT "ProyectoServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "public"."CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoServicioItem" ADD CONSTRAINT "ProyectoServicioItem_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "public"."ProyectoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoGasto" ADD CONSTRAINT "ProyectoGasto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProyectoGastoItem" ADD CONSTRAINT "ProyectoGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "public"."ProyectoGasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipo" ADD CONSTRAINT "ListaEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipo" ADD CONSTRAINT "ListaEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_cotizacionSeleccionadaId_fkey" FOREIGN KEY ("cotizacionSeleccionadaId") REFERENCES "public"."CotizacionProveedorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "public"."ListaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "public"."Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "public"."ProyectoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "public"."ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_reemplazaProyectoEquipoItemId_fkey" FOREIGN KEY ("reemplazaProyectoEquipoItemId") REFERENCES "public"."ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "public"."Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."CotizacionProveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "public"."ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "public"."ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "public"."ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "public"."ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "public"."ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."PedidoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Valorizacion" ADD CONSTRAINT "Valorizacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "public"."ProyectoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroHoras" ADD CONSTRAINT "RegistroHoras_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "public"."Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroHoras" ADD CONSTRAINT "RegistroHoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoEdtId_fkey" FOREIGN KEY ("proyectoEdtId") REFERENCES "public"."proyecto_edt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegistroHoras" ADD CONSTRAINT "RegistroHoras_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "public"."CategoriaServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tareas" ADD CONSTRAINT "tareas_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "public"."ProyectoServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tareas" ADD CONSTRAINT "tareas_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subtareas" ADD CONSTRAINT "subtareas_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "public"."tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subtareas" ADD CONSTRAINT "subtareas_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaOrigenId_fkey" FOREIGN KEY ("tareaOrigenId") REFERENCES "public"."tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaDependienteId_fkey" FOREIGN KEY ("tareaDependienteId") REFERENCES "public"."tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "public"."tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."registros_progreso" ADD CONSTRAINT "registros_progreso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "public"."tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."registros_progreso" ADD CONSTRAINT "registros_progreso_subtareaId_fkey" FOREIGN KEY ("subtareaId") REFERENCES "public"."subtareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."registros_progreso" ADD CONSTRAINT "registros_progreso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
