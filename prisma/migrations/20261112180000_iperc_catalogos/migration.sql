-- Catálogos del IPERC: peligros, controles y matriz de riesgo.
--
-- Vivían como constantes en src/lib/iperc/catalogos/*.ts. Corregir un dato
-- exigía commit, deploy y un script sobre las filas ya generadas — como pasó
-- con "Trastornó musculo-esquelético", copiado a 108 filas de 5 proyectos.

CREATE TABLE "iperc_catalogo_peligro" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "peligro" TEXT NOT NULL,
    "riesgo" TEXT NOT NULL,
    "consecuencia" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_catalogo_peligro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "iperc_catalogo_peligro_categoria_peligro_riesgo_key"
    ON "iperc_catalogo_peligro"("categoria", "peligro", "riesgo");
CREATE INDEX "iperc_catalogo_peligro_activo_categoria_idx"
    ON "iperc_catalogo_peligro"("activo", "categoria");

CREATE TABLE "iperc_catalogo_control" (
    "id" TEXT NOT NULL,
    "tipoPeligro" TEXT NOT NULL,
    "jerarquia" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_catalogo_control_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "iperc_catalogo_control_tipoPeligro_jerarquia_texto_key"
    ON "iperc_catalogo_control"("tipoPeligro", "jerarquia", "texto");
CREATE INDEX "iperc_catalogo_control_activo_tipoPeligro_idx"
    ON "iperc_catalogo_control"("activo", "tipoPeligro");

CREATE TABLE "iperc_catalogo_matriz" (
    "id" TEXT NOT NULL,
    "severidad" INTEGER NOT NULL,
    "probabilidad" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "nivel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_catalogo_matriz_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "iperc_catalogo_matriz_severidad_probabilidad_key"
    ON "iperc_catalogo_matriz"("severidad", "probabilidad");
