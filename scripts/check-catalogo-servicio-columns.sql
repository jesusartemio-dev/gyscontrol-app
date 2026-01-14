SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'CatalogoServicio'
AND column_name IN ('formula', 'horaUnidad', 'horaFijo', 'horaBase', 'horaRepetido')
ORDER BY column_name;