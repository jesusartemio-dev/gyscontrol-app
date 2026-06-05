-- Hora de ingreso por turno y día (para compartir la programación).
CREATE TABLE "planificacion_turno_hora" (
  "id" TEXT NOT NULL,
  "fecha" DATE NOT NULL,
  "turno" "TurnoDia" NOT NULL,
  "horaIngreso" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "planificacion_turno_hora_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planificacion_turno_hora_fecha_turno_key"
  ON "planificacion_turno_hora"("fecha", "turno");
