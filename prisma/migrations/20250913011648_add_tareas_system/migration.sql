/*
  Warnings:

  - You are about to drop the column `correo` on the `Proveedor` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `Proveedor` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `Proveedor` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('pendiente', 'en_proceso', 'completada', 'pausada', 'cancelada');

-- CreateEnum
CREATE TYPE "PrioridadTarea" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "TipoDependencia" AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');

-- AlterTable
ALTER TABLE "Proveedor" DROP COLUMN "correo",
DROP COLUMN "direccion",
DROP COLUMN "telefono";

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

-- CreateIndex
CREATE UNIQUE INDEX "dependencias_tarea_tareaOrigenId_tareaDependienteId_key" ON "dependencias_tarea"("tareaOrigenId", "tareaDependienteId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_recurso_tareaId_usuarioId_key" ON "asignaciones_recurso"("tareaId", "usuarioId");

-- CreateIndex
CREATE INDEX "idx_lista_proyecto_estado_fecha" ON "ListaEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_responsable_estado_aprobacion" ON "ListaEquipo"("responsableId", "estado", "fechaAprobacionFinal");

-- CreateIndex
CREATE INDEX "idx_lista_estado_necesaria_fecha" ON "ListaEquipo"("estado", "fechaNecesaria", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_item_lista_estado_fecha" ON "ListaEquipoItem"("listaId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_item_responsable_estado_verificado" ON "ListaEquipoItem"("responsableId", "estado", "verificado");

-- CreateIndex
CREATE INDEX "idx_lista_item_proveedor_estado_precio" ON "ListaEquipoItem"("proveedorId", "estado", "precioElegido");

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_estado_fecha" ON "PedidoEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_responsable_estado_fecha" ON "PedidoEquipo"("responsableId", "estado", "fechaNecesaria");

-- CreateIndex
CREATE INDEX "idx_pedido_estado_prioridad_fecha" ON "PedidoEquipo"("estado", "prioridad", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_responsable_estado" ON "PedidoEquipo"("proyectoId", "responsableId", "estado");

-- CreateIndex
CREATE INDEX "idx_proyecto_estado_inicio_fecha" ON "Proyecto"("estado", "fechaInicio", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_proyecto_comercial_estado_inicio" ON "Proyecto"("comercialId", "estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "idx_proyecto_gestor_estado_fin" ON "Proyecto"("gestorId", "estado", "fechaFin");

-- CreateIndex
CREATE INDEX "idx_proyecto_cliente_estado_fecha" ON "Proyecto"("clienteId", "estado", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtareas" ADD CONSTRAINT "subtareas_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtareas" ADD CONSTRAINT "subtareas_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaOrigenId_fkey" FOREIGN KEY ("tareaOrigenId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaDependienteId_fkey" FOREIGN KEY ("tareaDependienteId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_subtareaId_fkey" FOREIGN KEY ("subtareaId") REFERENCES "subtareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
