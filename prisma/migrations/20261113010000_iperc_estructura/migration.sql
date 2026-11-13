-- La estructura del IPERC antes de analizar, y el catálogo de actividades
-- fijas que no salen del cronograma.
--
-- El SSOMA arma primero, en una hoja aparte, la lista de actividades y tareas
-- con cuántos peligros tendrá cada una, y recién con esa lista cerrada empieza
-- a analizar. En el IPERC de CJM50 previó 57 filas para 18 tareas, de 1 a 7
-- según el trabajo, y acertó en 17 de 18.

CREATE TABLE "iperc_catalogo_actividad_fija" (
    "id" TEXT NOT NULL,
    "proceso" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "tarea" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "puestoTrabajo" TEXT NOT NULL,
    "factorRiesgo" TEXT NOT NULL,
    "condicionActividad" TEXT NOT NULL,
    "peligro" TEXT NOT NULL,
    "riesgo" TEXT NOT NULL,
    "consecuencia" TEXT NOT NULL,
    "severidad" INTEGER NOT NULL,
    "probabilidad" TEXT NOT NULL,
    "eliminar" TEXT NOT NULL DEFAULT 'NA',
    "sustituir" TEXT NOT NULL DEFAULT 'NA',
    "controlIngenieria" TEXT NOT NULL DEFAULT '',
    "controlAdministrativo" TEXT NOT NULL DEFAULT '',
    "controlReceptor" TEXT NOT NULL DEFAULT '',
    "accionesMejora" TEXT NOT NULL DEFAULT '',
    "responsables" TEXT NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_catalogo_actividad_fija_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "iperc_catalogo_actividad_fija_proceso_actividad_tarea_peli_key"
    ON "iperc_catalogo_actividad_fija"("proceso", "actividad", "tarea", "peligro");

CREATE INDEX "iperc_catalogo_actividad_fija_activo_proceso_idx"
    ON "iperc_catalogo_actividad_fija"("activo", "proceso");

CREATE TABLE "iperc_estructura_item" (
    "id" TEXT NOT NULL,
    "ipercId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "proceso" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "tarea" TEXT NOT NULL,
    "peligrosPrevistos" INTEGER NOT NULL DEFAULT 3,
    "origen" TEXT NOT NULL DEFAULT 'cronograma',
    "catalogoActividadFijaId" TEXT,
    "tareaIds" TEXT[],
    "actividadCronogramaRefId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "filasGeneradas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_estructura_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "iperc_estructura_item_ipercId_orden_idx"
    ON "iperc_estructura_item"("ipercId", "orden");

CREATE INDEX "iperc_estructura_item_catalogoActividadFijaId_idx"
    ON "iperc_estructura_item"("catalogoActividadFijaId");

ALTER TABLE "iperc_estructura_item"
    ADD CONSTRAINT "iperc_estructura_item_ipercId_fkey"
    FOREIGN KEY ("ipercId") REFERENCES "iperc"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "iperc_estructura_item"
    ADD CONSTRAINT "iperc_estructura_item_catalogoActividadFijaId_fkey"
    FOREIGN KEY ("catalogoActividadFijaId") REFERENCES "iperc_catalogo_actividad_fija"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
