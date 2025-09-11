/**
 * 🎯 ListaEquipoDetailViewWrapper Component
 * 
 * Wrapper component to handle Client Component integration with Server Components.
 * This component receives server-side data and passes it to the client-side detail view.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import ListaEquipoDetailView from './ListaEquipoDetailView';
import type { ListaEquipo, ListaEquipoItem, Proyecto } from '@/types/modelos';

// ✅ Props interface
interface ListaEquipoDetailViewWrapperProps {
  proyectoId: string;
  listaId: string;
  initialLista?: ListaEquipo;
  initialItems?: ListaEquipoItem[];
  initialProyecto?: Proyecto;
}

// ✅ Wrapper component
const ListaEquipoDetailViewWrapper: React.FC<ListaEquipoDetailViewWrapperProps> = (props) => {
  return <ListaEquipoDetailView {...props} />;
};

export default ListaEquipoDetailViewWrapper;
export type { ListaEquipoDetailViewWrapperProps };
