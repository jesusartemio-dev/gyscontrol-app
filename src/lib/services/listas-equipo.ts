/**
 * 🎯 Servicios de Listas de Equipo - API Client
 * 
 * Servicios para gestión de listas de equipos con validación,
 * manejo de errores y optimización de performance.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { ListaEquipoMaster } from '@/types/master-detail';
import { logger } from '@/lib/logger';

// 🌐 Base URL para APIs
const API_BASE = '/api/listas-equipo';

/**
 * 📡 Obtener lista de equipo por ID
 */
export async function getListaEquipo(id: string): Promise<ListaEquipoMaster | null> {
  try {
    logger.info(`Fetching lista equipo: ${id}`);
    
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always get fresh data
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn(`Lista equipo not found: ${id}`);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Lista equipo fetched successfully: ${id}`);
    
    return data;
  } catch (error) {
    logger.error('Error fetching lista equipo:', error);
    throw error;
  }
}

/**
 * 📡 Obtener listas de equipo por proyecto
 */
export async function getListasEquipoPorProyecto(proyectoId: string): Promise<ListaEquipoMaster[]> {
  try {
    logger.info(`Fetching listas equipo for proyecto: ${proyectoId}`);
    
    const response = await fetch(`${API_BASE}?proyectoId=${proyectoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Fetched ${data.length} listas equipo for proyecto: ${proyectoId}`);
    
    return data;
  } catch (error) {
    logger.error('Error fetching listas equipo por proyecto:', error);
    throw error;
  }
}

/**
 * 📡 Obtener todas las listas de equipo
 */
export async function getListasEquipo(): Promise<ListaEquipoMaster[]> {
  try {
    logger.info('Fetching all listas equipo');
    
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Fetched ${data.length} listas equipo`);
    
    return data;
  } catch (error) {
    logger.error('Error fetching listas equipo:', error);
    throw error;
  }
}

/**
 * 🔄 Crear nueva lista de equipo
 */
export async function createListaEquipo(lista: Omit<ListaEquipoMaster, 'id' | 'createdAt' | 'updatedAt'>): Promise<ListaEquipoMaster> {
  try {
    logger.info('Creating new lista equipo:', lista.nombre);
    
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lista),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Lista equipo created successfully: ${data.id}`);
    
    return data;
  } catch (error) {
    logger.error('Error creating lista equipo:', error);
    throw error;
  }
}

/**
 * ✏️ Actualizar lista de equipo
 */
export async function updateListaEquipo(id: string, updates: Partial<ListaEquipoMaster>): Promise<ListaEquipoMaster> {
  try {
    logger.info(`Updating lista equipo: ${id}`);
    
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Lista equipo updated successfully: ${id}`);
    
    return data;
  } catch (error) {
    logger.error('Error updating lista equipo:', error);
    throw error;
  }
}

/**
 * 🗑️ Eliminar lista de equipo
 */
export async function deleteListaEquipo(id: string): Promise<void> {
  try {
    logger.info(`Deleting lista equipo: ${id}`);
    
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    logger.info(`Lista equipo deleted successfully: ${id}`);
  } catch (error) {
    logger.error('Error deleting lista equipo:', error);
    throw error;
  }
}

// 📤 Exports
export default {
  getListaEquipo,
  getListasEquipoPorProyecto,
  getListasEquipo,
  createListaEquipo,
  updateListaEquipo,
  deleteListaEquipo,
};