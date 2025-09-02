/**
 * 🚫 Not Found Page for Lista Equipo Detail
 * 
 * Custom 404 page for equipment list detail routes.
 * Provides contextual error messaging and navigation options.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Home, Search } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Lista no encontrada
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              La lista de equipos que buscas no existe o no tienes permisos para acceder a ella.
            </p>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Posibles causas:
              </p>
              <ul className="text-sm text-muted-foreground text-left space-y-1">
                <li>• La lista fue eliminada</li>
                <li>• El enlace es incorrecto</li>
                <li>• No tienes permisos de acceso</li>
                <li>• El proyecto no existe</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-2 pt-4">
              <Button asChild className="w-full">
                <Link href="/proyectos">
                  <Home className="w-4 h-4 mr-2" />
                  Ir a Proyectos
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="javascript:history.back()">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver Atrás
                </Link>
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Si crees que esto es un error, contacta al administrador del sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFoundPage;