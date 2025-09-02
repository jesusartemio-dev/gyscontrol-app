/**
 * 🎯 Servicios de Proyectos - API Client
 * 
 * Servicios para gestión de proyectos con validación,
 * manejo de errores y optimización de performance.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { Proyecto } from '@/types/modelos';
import { logger } from '@/lib/logger';
import { buildApiUrl } from '@/lib/utils';

// 🌐 Base URL para APIs
const API_BASE = '/api/proyecto';

/**
 * 📡 Obtener proyecto por ID
 */
export async function getProyecto(id: string): Promise<Proyecto | null> {
  try {
    logger.info(`Fetching proyecto: ${id}`);
    
    const url = buildApiUrl(`${API_BASE}/${id}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always get fresh data
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn(`Proyecto not found: ${id}`);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Proyecto fetched successfully: ${id}`);
    
    return data;
  } catch (error) {
    logger.error('Error fetching proyecto:', error);
    throw error;
  }
}

/**
 * 📡 Obtener todos los proyectos
 */
export async function getProyectos(): Promise<Proyecto[]> {
  try {
    logger.info('Fetching all proyectos');
    
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
    logger.info(`Fetched ${data.length} proyectos`);
    
    return data;
  } catch (error) {
    logger.error('Error fetching proyectos:', error);
    throw error;
  }
}

/**
 * 🔄 Crear nuevo proyecto
 */
export async function createProyecto(proyecto: Omit<Proyecto, 'id' | 'createdAt' | 'updatedAt'>): Promise<Proyecto> {
  try {
    logger.info('Creating new proyecto:', proyecto.nombre);
    
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proyecto),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info(`Proyecto created successfully: ${data.id}`);
    
    return data;
  } catch (error) {
    logger.error('Error creating proyecto:', error);
    throw error;
  }
}

/**
 * ✏️ Actualizar proyecto
 */
export async function updateProyecto(id: string, updates: Partial<Proyecto>): Promise<Proyecto> {
  try {
    logger.info(`Updating proyecto: ${id}`);
    
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
    logger.info(`Proyecto updated successfully: ${id}`);
    
    return data;
  } catch (error) {
    logger.error('Error updating proyecto:', error);
    throw error;
  }
}

/**
 * 🗑️ Eliminar proyecto
 */
export async function deleteProyecto(id: string): Promise<void> {
  try {
    logger.info(`Deleting proyecto: ${id}`);
    
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    logger.info(`Proyecto deleted successfully: ${id}`);
  } catch (error) {
    logger.error('Error deleting proyecto:', error);
    throw error;
  }
}

// 📤 Exports
export default {
  getProyecto,
  getProyectos,
  createProyecto,
  updateProyecto,
  deleteProyecto,
};