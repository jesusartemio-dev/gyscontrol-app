#!/bin/bash
# Script para validar que el schema tiene todos los modelos esperados

EXPECTED_MODELS=93
CURRENT_MODELS=$(grep -E "^model " prisma/schema.prisma | wc -l)

echo "📊 Validación de Schema Prisma"
echo "================================"
echo "Modelos esperados: $EXPECTED_MODELS"
echo "Modelos actuales:  $CURRENT_MODELS"

if [ "$CURRENT_MODELS" -eq "$EXPECTED_MODELS" ]; then
  echo "✅ CORRECTO: Todos los modelos están presentes"
  exit 0
else
  echo "❌ ERROR: Faltan modelos!"
  echo "Diferencia: $((EXPECTED_MODELS - CURRENT_MODELS)) modelos"
  exit 1
fi
