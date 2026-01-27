-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('pendiente', 'revisado_tecnico', 'aprobado_coordinador', 'aprobado_gestor', 'en_lista', 'comprado', 'reemplazado', 'entregado');

-- CreateEnum
CREATE TYPE "EstadoEquipoItem" AS ENUM ('pendiente', 'en_lista', 'reemplazado', 'descartado');

-- CreateEnum
CREATE TYPE "EstadoListaItem" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "OrigenListaItem" AS ENUM ('cotizado', 'nuevo', 'reemplazo');

-- CreateEnum
CREATE TYPE "EstadoListaEquipo" AS ENUM ('borrador', 'enviada', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobada', 'rechazada', 'completada');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPedidoItem" AS ENUM ('pendiente', 'atendido', 'parcial', 'entregado');

-- CreateEnum
CREATE TYPE "EstadoEntregaItem" AS ENUM ('pendiente', 'en_proceso', 'parcial', 'entregado', 'retrasado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoCotizacionProveedor" AS ENUM ('pendiente', 'solicitado', 'cotizado', 'rechazado', 'seleccionado');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('colaborador', 'comercial', 'presupuestos', 'proyectos', 'coordinador', 'logistico', 'gestor', 'gerente', 'admin');

-- CreateEnum
CREATE TYPE "ProyectoEstado" AS ENUM ('creado', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados', 'en_ejecucion', 'completado', 'pausado', 'cancelado', 'en_planificacion');

-- CreateEnum
CREATE TYPE "EstadoEdt" AS ENUM ('planificado', 'en_progreso', 'detenido', 'completado', 'cancelado', 'pausado');

-- CreateEnum
CREATE TYPE "PrioridadEdt" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "OrigenTrabajo" AS ENUM ('oficina', 'campo');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada');

-- CreateEnum
CREATE TYPE "PrioridadTarea" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "TipoDependencia" AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');

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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'colaborador',
    "image" TEXT,
    "metaMensual" DOUBLE PRECISION,
    "metaTrimestral" DOUBLE PRECISION,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
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
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Cliente" (
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
    "calificacion" INTEGER DEFAULT 3,
    "estadoRelacion" TEXT NOT NULL DEFAULT 'prospecto',
    "frecuenciaCompra" TEXT,
    "linkedin" TEXT,
    "potencialAnual" DOUBLE PRECISION,
    "sector" TEXT,
    "sitioWeb" TEXT,
    "tamanoEmpresa" TEXT,
    "ultimoProyecto" TIMESTAMP(3),
    "calificacionSatisfaccion" INTEGER DEFAULT 3,
    "frecuenciaCompraMeses" INTEGER,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaEquipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "CategoriaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "faseDefaultId" TEXT,

    CONSTRAINT "CategoriaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recurso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costoHora" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoEquipo" (
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
CREATE TABLE "CatalogoServicio" (
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
    "orden" INTEGER DEFAULT 0,

    CONSTRAINT "CatalogoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plantilla" (
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
    "tipo" "PlantillaTipo" NOT NULL DEFAULT 'completa',

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaEquipo" (
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
CREATE TABLE "PlantillaEquipoItem" (
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
CREATE TABLE "PlantillaServicio" (
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
CREATE TABLE "PlantillaServicioItem" (
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
CREATE TABLE "PlantillaGasto" (
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
CREATE TABLE "PlantillaGastoItem" (
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
CREATE TABLE "Cotizacion" (
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
    "prioridad" TEXT,
    "probabilidad" INTEGER,
    "fechaEnvio" TIMESTAMP(3),
    "fechaCierreEstimada" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fechaValidezHasta" TIMESTAMP(3),
    "formaPago" TEXT,
    "incluyeIGV" BOOLEAN DEFAULT false,
    "moneda" TEXT DEFAULT 'USD',
    "referencia" TEXT,
    "revision" TEXT DEFAULT 'R01',
    "validezOferta" INTEGER DEFAULT 15,
    "competencia" TEXT,
    "fechaProximaAccion" TIMESTAMP(3),
    "fechaUltimoContacto" TIMESTAMP(3),
    "posicionVsCompetencia" TEXT,
    "prioridadCrm" TEXT DEFAULT 'media',
    "probabilidadCierre" INTEGER DEFAULT 0,
    "proximaAccion" TEXT,
    "razonCierre" TEXT,
    "retroalimentacionCliente" TEXT,
    "calendarioLaboralId" TEXT,
    "fechaFin" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'borrador',

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionEquipo" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plazoEntregaSemanas" INTEGER,

    CONSTRAINT "CotizacionEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionEquipoItem" (
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
CREATE TABLE "CotizacionServicio" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plazoEntregaSemanas" INTEGER,

    CONSTRAINT "CotizacionServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionServicioItem" (
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
    "orden" INTEGER DEFAULT 0,

    CONSTRAINT "CotizacionServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionGasto" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plazoEntregaSemanas" INTEGER,

    CONSTRAINT "CotizacionGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionGastoItem" (
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
CREATE TABLE "cotizacion_edt" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "cotizacionServicioId" TEXT,
    "categoriaServicioId" TEXT,
    "fechaInicioComercial" TIMESTAMP(3),
    "fechaFinComercial" TIMESTAMP(3),
    "horasEstimadas" DECIMAL(10,2) DEFAULT 0,
    "estado" "EstadoEdt" NOT NULL DEFAULT 'planificado',
    "responsableId" TEXT,
    "descripcion" TEXT,
    "prioridad" "PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cotizacionFaseId" TEXT,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cotizacion_edt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_tarea" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horasEstimadas" DECIMAL(10,2),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'media',
    "dependenciaId" TEXT,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cotizacionServicioItemId" TEXT,
    "cotizacionActividadId" TEXT NOT NULL,
    "duracionHoras" DECIMAL(10,2),
    "esHito" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cotizacion_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
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
    "estado" "ProyectoEstado" NOT NULL DEFAULT 'en_ejecucion',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "totalRealEquipos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRealServicios" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRealGastos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "progresoGeneral" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_edt" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "categoriaServicioId" TEXT NOT NULL,
    "fechaInicioPlan" TIMESTAMP(3),
    "fechaFinPlan" TIMESTAMP(3),
    "horasPlan" DECIMAL(10,2) DEFAULT 0,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "horasReales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "EstadoEdt" NOT NULL DEFAULT 'planificado',
    "responsableId" TEXT,
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "prioridad" "PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "proyectoCronogramaId" TEXT NOT NULL,
    "proyectoFaseId" TEXT,

    CONSTRAINT "proyecto_edt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "estado" "EstadoListaEquipo" NOT NULL DEFAULT 'borrador',
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
CREATE TABLE "ListaEquipoItem" (
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
    "estado" "EstadoListaItem" NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "origen" "OrigenListaItem" NOT NULL DEFAULT 'nuevo',
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "responsableId" TEXT NOT NULL,
    "reemplazaProyectoEquipoCotizadoItemId" TEXT,

    CONSTRAINT "ListaEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
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
CREATE TABLE "CotizacionProveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "CotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedorItem" (
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
    "estado" "EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',
    "esSeleccionada" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaId" TEXT,

    CONSTRAINT "CotizacionProveedorItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "listaId" TEXT,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'borrador',
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
CREATE TABLE "PedidoEquipoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT,
    "cantidadPedida" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "estado" "EstadoPedidoItem" NOT NULL DEFAULT 'pendiente',
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
    "estadoEntrega" "EstadoEntregaItem" NOT NULL DEFAULT 'pendiente',
    "observacionesEntrega" TEXT,

    CONSTRAINT "PedidoEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valorizacion" (
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
CREATE TABLE "RegistroHoras" (
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
    "origen" "OrigenTrabajo",
    "ubicacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proyectoTareaId" TEXT,

    CONSTRAINT "RegistroHoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'media',
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
CREATE TABLE "subtareas" (
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
    "tareaId" TEXT NOT NULL,
    "asignadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencias_tarea" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDependencia" NOT NULL DEFAULT 'finish_to_start',
    "tareaOrigenId" TEXT NOT NULL,
    "tareaDependienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependencias_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_recurso" (
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
CREATE TABLE "registros_progreso" (
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

-- CreateTable
CREATE TABLE "cotizacion_exclusion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_condicion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "tipo" TEXT,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_condicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_exclusion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_exclusion_item" (
    "id" TEXT NOT NULL,
    "plantillaExclusionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_exclusion_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_condicion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "tipo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_condicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_condicion_item" (
    "id" TEXT NOT NULL,
    "plantillaCondicionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_condicion_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_oportunidad" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "valorEstimado" DOUBLE PRECISION,
    "probabilidad" INTEGER NOT NULL DEFAULT 0,
    "fechaCierreEstimada" TIMESTAMP(3),
    "fuente" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "comercialId" TEXT,
    "responsableId" TEXT,
    "fechaUltimoContacto" TIMESTAMP(3),
    "notas" TEXT,
    "competencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cotizacionId" TEXT,
    "proyectoId" TEXT,
    "estado" "EstadoOportunidad" NOT NULL DEFAULT 'prospecto',

    CONSTRAINT "crm_oportunidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_actividad" (
    "id" TEXT NOT NULL,
    "oportunidadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT,
    "notas" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_competidor_licitacion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombreEmpresa" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "propuestaEconomica" DOUBLE PRECISION,
    "propuestaTecnica" TEXT,
    "fortalezas" TEXT,
    "debilidades" TEXT,
    "precioVsNuestro" TEXT,
    "resultado" TEXT,
    "razonPerdida" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_competidor_licitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contacto_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "celular" TEXT,
    "esDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "areasInfluencia" TEXT,
    "relacionComercial" TEXT,
    "fechaUltimoContacto" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_contacto_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_historial_proyecto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "cotizacionId" TEXT,
    "nombreProyecto" TEXT NOT NULL,
    "tipoProyecto" TEXT NOT NULL,
    "sector" TEXT,
    "complejidad" TEXT,
    "valorContrato" DOUBLE PRECISION,
    "margenObtenido" DOUBLE PRECISION,
    "duracionDias" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "fechaAdjudicacion" TIMESTAMP(3),
    "calificacionCliente" INTEGER,
    "retroalimentacion" TEXT,
    "exitos" TEXT,
    "problemas" TEXT,
    "recomendaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_historial_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_metrica_comercial" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_metrica_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_version" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "snapshot" TEXT NOT NULL,
    "cambios" TEXT,
    "motivoCambio" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_version_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "EntregaItem" (
    "id" TEXT NOT NULL,
    "pedidoEquipoItemId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT,
    "proyectoId" TEXT NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoEntregaItem" NOT NULL DEFAULT 'pendiente',
    "cantidad" DOUBLE PRECISION NOT NULL,
    "cantidadEntregada" DOUBLE PRECISION DEFAULT 0,
    "observaciones" TEXT,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntregaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoTrazabilidad" (
    "id" TEXT NOT NULL,
    "entregaItemId" TEXT,
    "proyectoId" TEXT,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estadoAnterior" "EstadoEntregaItem",
    "estadoNuevo" "EstadoEntregaItem",
    "fechaEvento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoTrazabilidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_nombre_key" ON "Unidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadServicio_nombre_key" ON "UnidadServicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaEquipo_nombre_key" ON "CategoriaEquipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaServicio_nombre_key" ON "CategoriaServicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Recurso_nombre_key" ON "Recurso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoEquipo_codigo_key" ON "CatalogoEquipo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_codigo_key" ON "Cotizacion"("codigo");

-- CreateIndex
CREATE INDEX "cotizacion_edt_estado_fechaFinComercial_idx" ON "cotizacion_edt"("estado", "fechaFinComercial");

-- CreateIndex
CREATE INDEX "cotizacion_edt_responsableId_estado_idx" ON "cotizacion_edt"("responsableId", "estado");

-- CreateIndex
CREATE INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_idx" ON "cotizacion_edt"("cotizacionId", "cotizacionServicioId");

-- CreateIndex
CREATE INDEX "cotizacion_edt_cotizacionId_orden_idx" ON "cotizacion_edt"("cotizacionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_edt_cotizacionId_nombre_key" ON "cotizacion_edt"("cotizacionId", "nombre");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_responsableId_fechaFin_idx" ON "cotizacion_tarea"("responsableId", "fechaFin");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_dependenciaId_idx" ON "cotizacion_tarea"("dependenciaId");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_cotizacionServicioItemId_idx" ON "cotizacion_tarea"("cotizacionServicioItemId");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_cotizacionActividadId_estado_idx" ON "cotizacion_tarea"("cotizacionActividadId", "estado");

-- CreateIndex
CREATE INDEX "idx_proyecto_estado_inicio_fecha" ON "Proyecto"("estado", "fechaInicio", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_proyecto_comercial_estado_inicio" ON "Proyecto"("comercialId", "estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "idx_proyecto_gestor_estado_fin" ON "Proyecto"("gestorId", "estado", "fechaFin");

-- CreateIndex
CREATE INDEX "idx_proyecto_cliente_estado_fecha" ON "Proyecto"("clienteId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "proyecto_edt_estado_fechaFinPlan_idx" ON "proyecto_edt"("estado", "fechaFinPlan");

-- CreateIndex
CREATE INDEX "proyecto_edt_responsableId_estado_idx" ON "proyecto_edt"("responsableId", "estado");

-- CreateIndex
CREATE INDEX "proyecto_edt_proyectoId_proyectoCronogramaId_orden_idx" ON "proyecto_edt"("proyectoId", "proyectoCronogramaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_edt_proyectoId_proyectoCronogramaId_categoriaServi_key" ON "proyecto_edt"("proyectoId", "proyectoCronogramaId", "categoriaServicioId");

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipo_codigo_key" ON "ListaEquipo"("codigo");

-- CreateIndex
CREATE INDEX "idx_lista_proyecto_estado_fecha" ON "ListaEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_responsable_estado_aprobacion" ON "ListaEquipo"("responsableId", "estado", "fechaAprobacionFinal");

-- CreateIndex
CREATE INDEX "idx_lista_estado_necesaria_fecha" ON "ListaEquipo"("estado", "fechaNecesaria", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipoItem_cotizacionSeleccionadaId_key" ON "ListaEquipoItem"("cotizacionSeleccionadaId");

-- CreateIndex
CREATE INDEX "idx_lista_item_lista_estado_fecha" ON "ListaEquipoItem"("listaId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_item_responsable_estado_verificado" ON "ListaEquipoItem"("responsableId", "estado", "verificado");

-- CreateIndex
CREATE INDEX "idx_lista_item_proveedor_estado_precio" ON "ListaEquipoItem"("proveedorId", "estado", "precioElegido");

-- CreateIndex
CREATE UNIQUE INDEX "CotizacionProveedor_codigo_key" ON "CotizacionProveedor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoEquipo_codigo_key" ON "PedidoEquipo"("codigo");

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_estado_fecha" ON "PedidoEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_responsable_estado_fecha" ON "PedidoEquipo"("responsableId", "estado", "fechaNecesaria");

-- CreateIndex
CREATE INDEX "idx_pedido_estado_prioridad_fecha" ON "PedidoEquipo"("estado", "prioridad", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_responsable_estado" ON "PedidoEquipo"("proyectoId", "responsableId", "estado");

-- CreateIndex
CREATE INDEX "RegistroHoras_categoriaServicioId_fechaTrabajo_idx" ON "RegistroHoras"("categoriaServicioId", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_origen_fechaTrabajo_idx" ON "RegistroHoras"("origen", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_proyectoEdtId_proyectoTareaId_fechaTrabajo_idx" ON "RegistroHoras"("proyectoEdtId", "proyectoTareaId", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_proyectoTareaId_fechaTrabajo_idx" ON "RegistroHoras"("proyectoTareaId", "fechaTrabajo");

-- CreateIndex
CREATE UNIQUE INDEX "dependencias_tarea_tareaOrigenId_tareaDependienteId_key" ON "dependencias_tarea"("tareaOrigenId", "tareaDependienteId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_recurso_tareaId_usuarioId_key" ON "asignaciones_recurso"("tareaId", "usuarioId");

-- CreateIndex
CREATE INDEX "cotizacion_exclusion_cotizacionId_orden_idx" ON "cotizacion_exclusion"("cotizacionId", "orden");

-- CreateIndex
CREATE INDEX "cotizacion_condicion_cotizacionId_orden_idx" ON "cotizacion_condicion"("cotizacionId", "orden");

-- CreateIndex
CREATE INDEX "plantilla_exclusion_categoria_activo_idx" ON "plantilla_exclusion"("categoria", "activo");

-- CreateIndex
CREATE INDEX "plantilla_exclusion_item_plantillaExclusionId_orden_idx" ON "plantilla_exclusion_item"("plantillaExclusionId", "orden");

-- CreateIndex
CREATE INDEX "plantilla_condicion_categoria_tipo_activo_idx" ON "plantilla_condicion"("categoria", "tipo", "activo");

-- CreateIndex
CREATE INDEX "plantilla_condicion_item_plantillaCondicionId_orden_idx" ON "plantilla_condicion_item"("plantillaCondicionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "crm_oportunidad_cotizacionId_key" ON "crm_oportunidad"("cotizacionId");

-- CreateIndex
CREATE INDEX "crm_oportunidad_clienteId_estado_idx" ON "crm_oportunidad"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "crm_oportunidad_comercialId_fechaCierreEstimada_idx" ON "crm_oportunidad"("comercialId", "fechaCierreEstimada");

-- CreateIndex
CREATE INDEX "crm_actividad_oportunidadId_fecha_idx" ON "crm_actividad"("oportunidadId", "fecha");

-- CreateIndex
CREATE INDEX "crm_competidor_licitacion_cotizacionId_idx" ON "crm_competidor_licitacion"("cotizacionId");

-- CreateIndex
CREATE INDEX "crm_contacto_cliente_clienteId_esDecisionMaker_idx" ON "crm_contacto_cliente"("clienteId", "esDecisionMaker");

-- CreateIndex
CREATE INDEX "crm_historial_proyecto_clienteId_fechaInicio_idx" ON "crm_historial_proyecto"("clienteId", "fechaInicio");

-- CreateIndex
CREATE INDEX "crm_historial_proyecto_tipoProyecto_sector_idx" ON "crm_historial_proyecto"("tipoProyecto", "sector");

-- CreateIndex
CREATE INDEX "crm_metrica_comercial_periodo_idx" ON "crm_metrica_comercial"("periodo");

-- CreateIndex
CREATE UNIQUE INDEX "crm_metrica_comercial_usuarioId_periodo_key" ON "crm_metrica_comercial"("usuarioId", "periodo");

-- CreateIndex
CREATE INDEX "cotizacion_version_cotizacionId_version_idx" ON "cotizacion_version"("cotizacionId", "version");

-- CreateIndex
CREATE INDEX "cotizacion_version_estado_createdAt_idx" ON "cotizacion_version"("estado", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_version_cotizacionId_version_key" ON "cotizacion_version"("cotizacionId", "version");

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
CREATE INDEX "EntregaItem_pedidoEquipoItemId_idx" ON "EntregaItem"("pedidoEquipoItemId");

-- CreateIndex
CREATE INDEX "EntregaItem_proyectoId_estado_idx" ON "EntregaItem"("proyectoId", "estado");

-- CreateIndex
CREATE INDEX "EntregaItem_fechaEntrega_idx" ON "EntregaItem"("fechaEntrega");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_entregaItemId_idx" ON "EventoTrazabilidad"("entregaItemId");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_proyectoId_idx" ON "EventoTrazabilidad"("proyectoId");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_fechaEvento_idx" ON "EventoTrazabilidad"("fechaEvento");

-- CreateIndex
CREATE INDEX "EventoTrazabilidad_tipo_fechaEvento_idx" ON "EventoTrazabilidad"("tipo", "fechaEvento");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaServicio" ADD CONSTRAINT "CategoriaServicio_faseDefaultId_fkey" FOREIGN KEY ("faseDefaultId") REFERENCES "fase_default"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoEquipo" ADD CONSTRAINT "CatalogoEquipo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoEquipo" ADD CONSTRAINT "CatalogoEquipo_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaEquipo" ADD CONSTRAINT "PlantillaEquipo_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaEquipoItem" ADD CONSTRAINT "PlantillaEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaEquipoItem" ADD CONSTRAINT "PlantillaEquipoItem_plantillaEquipoId_fkey" FOREIGN KEY ("plantillaEquipoId") REFERENCES "PlantillaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicio" ADD CONSTRAINT "PlantillaServicio_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_plantillaServicioId_fkey" FOREIGN KEY ("plantillaServicioId") REFERENCES "PlantillaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaGasto" ADD CONSTRAINT "PlantillaGasto_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaGastoItem" ADD CONSTRAINT "PlantillaGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "PlantillaGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "calendario_laboral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionEquipo" ADD CONSTRAINT "CotizacionEquipo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionEquipoItem" ADD CONSTRAINT "CotizacionEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionEquipoItem" ADD CONSTRAINT "CotizacionEquipoItem_cotizacionEquipoId_fkey" FOREIGN KEY ("cotizacionEquipoId") REFERENCES "CotizacionEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicio" ADD CONSTRAINT "CotizacionServicio_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "CotizacionServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionGasto" ADD CONSTRAINT "CotizacionGasto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionGastoItem" ADD CONSTRAINT "CotizacionGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "CotizacionGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "CategoriaServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionFaseId_fkey" FOREIGN KEY ("cotizacionFaseId") REFERENCES "cotizacion_fase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "CotizacionServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_cotizacionActividadId_fkey" FOREIGN KEY ("cotizacionActividadId") REFERENCES "cotizacion_actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_cotizacionServicioItemId_fkey" FOREIGN KEY ("cotizacionServicioItemId") REFERENCES "CotizacionServicioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "cotizacion_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "CategoriaServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_proyectoCronogramaId_fkey" FOREIGN KEY ("proyectoCronogramaId") REFERENCES "proyecto_cronograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_proyectoFaseId_fkey" FOREIGN KEY ("proyectoFaseId") REFERENCES "proyecto_fase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipo" ADD CONSTRAINT "ListaEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipo" ADD CONSTRAINT "ListaEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_cotizacionSeleccionadaId_fkey" FOREIGN KEY ("cotizacionSeleccionadaId") REFERENCES "CotizacionProveedorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipoCotizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "ProyectoEquipoCotizadoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_reemplazaProyectoEquipoCotizadoItemId_fkey" FOREIGN KEY ("reemplazaProyectoEquipoCotizadoItemId") REFERENCES "ProyectoEquipoCotizadoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "CotizacionProveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valorizacion" ADD CONSTRAINT "Valorizacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "CategoriaServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoEdtId_fkey" FOREIGN KEY ("proyectoEdtId") REFERENCES "proyecto_edt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicioCotizado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoTareaId_fkey" FOREIGN KEY ("proyectoTareaId") REFERENCES "proyecto_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicioCotizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtareas" ADD CONSTRAINT "subtareas_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtareas" ADD CONSTRAINT "subtareas_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaDependienteId_fkey" FOREIGN KEY ("tareaDependienteId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaOrigenId_fkey" FOREIGN KEY ("tareaOrigenId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_subtareaId_fkey" FOREIGN KEY ("subtareaId") REFERENCES "subtareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_exclusion" ADD CONSTRAINT "cotizacion_exclusion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_condicion" ADD CONSTRAINT "cotizacion_condicion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_exclusion_item" ADD CONSTRAINT "plantilla_exclusion_item_plantillaExclusionId_fkey" FOREIGN KEY ("plantillaExclusionId") REFERENCES "plantilla_exclusion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_condicion_item" ADD CONSTRAINT "plantilla_condicion_item_plantillaCondicionId_fkey" FOREIGN KEY ("plantillaCondicionId") REFERENCES "plantilla_condicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_actividad" ADD CONSTRAINT "crm_actividad_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "crm_oportunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_actividad" ADD CONSTRAINT "crm_actividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_competidor_licitacion" ADD CONSTRAINT "crm_competidor_licitacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacto_cliente" ADD CONSTRAINT "crm_contacto_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_metrica_comercial" ADD CONSTRAINT "crm_metrica_comercial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_version" ADD CONSTRAINT "cotizacion_version_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_version" ADD CONSTRAINT "cotizacion_version_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "EntregaItem" ADD CONSTRAINT "EntregaItem_pedidoEquipoItemId_fkey" FOREIGN KEY ("pedidoEquipoItemId") REFERENCES "PedidoEquipoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaItem" ADD CONSTRAINT "EntregaItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaItem" ADD CONSTRAINT "EntregaItem_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaItem" ADD CONSTRAINT "EntregaItem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTrazabilidad" ADD CONSTRAINT "EventoTrazabilidad_entregaItemId_fkey" FOREIGN KEY ("entregaItemId") REFERENCES "EntregaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTrazabilidad" ADD CONSTRAINT "EventoTrazabilidad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoTrazabilidad" ADD CONSTRAINT "EventoTrazabilidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
