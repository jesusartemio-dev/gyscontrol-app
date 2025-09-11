'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Page() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Opciones de Visualización - Columna Pedidos</h1>
        <p className="text-muted-foreground">
          Esta es la página de demostración donde puedes ver las diferentes opciones para mostrar múltiples pedidos por ítem.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demostración de Opciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Opción 1: Columna Mejorada</h3>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Badge variant="default">PED-001</Badge>
                  <Badge variant="secondary">PED-002</Badge>
                </div>
                <Badge variant="outline" className="w-fit">Disponible: 3/5</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Opción 2: Columnas Separadas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Pedidos:</p>
                  <div className="flex gap-1">
                    <Badge variant="default">PED-001</Badge>
                    <Badge variant="secondary">PED-002</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Disponibilidad:</p>
                  <Badge variant="outline">3/5 disponible</Badge>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Opción 3: Integrada en Cat./Unidad</h3>
              <div className="flex items-center gap-2">
                <span>VÁLVULAS / pieza</span>
                <Badge variant="destructive" className="text-xs">2 pedidos</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">¿Dónde están los cambios?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-700 space-y-2">
            <p>
              <strong>Esta es una página de demostración</strong> que muestra cómo se verían las diferentes opciones.
            </p>
            <p>
              Los cambios reales se implementarían en:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>src/components/equipos/ListaEquipoItemList.tsx</code> - La tabla principal</li>
              <li><code>src/app/proyectos/[id]/lista-equipos/page.tsx</code> - La página donde se usa</li>
            </ul>
            <p className="mt-4">
              <strong>¿Quieres que implemente la opción elegida en la tabla real?</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
