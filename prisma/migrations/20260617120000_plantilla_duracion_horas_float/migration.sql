-- PlantillaDuracionCronograma.horasPorDia: Int -> Float (permite 9.5 h/día, como el CalendarioLaboral)
-- y default 8 -> 9.5

ALTER TABLE "plantilla_duracion_cronograma"
  ALTER COLUMN "horasPorDia" SET DATA TYPE DOUBLE PRECISION,
  ALTER COLUMN "horasPorDia" SET DEFAULT 9.5;
