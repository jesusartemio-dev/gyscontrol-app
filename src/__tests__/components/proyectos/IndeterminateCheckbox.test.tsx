/**
 * 🧪 IndeterminateCheckbox Component Tests
 * 
 * Tests for the custom IndeterminateCheckbox component that supports
 * indeterminate state for bulk selection scenarios.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListaEquipoMasterList from '@/components/proyectos/ListaEquipoMasterList';
import { ListaEquipoMaster } from '@/types/master-detail';

// ✅ Mock data
const mockListas: ListaEquipoMaster[] = [
  {
    id: '1',
    nombre: 'Lista Test 1',
    estado: 'borrador',
    itemsCount: 5,
    completedItemsCount: 2,
    costoTotal: 1000,
    updatedAt: new Date('2024-01-01'),
    proyecto: {
      id: 'proj-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001'
    }
  },
  {
    id: '2',
    nombre: 'Lista Test 2',
    estado: 'aprobado',
    itemsCount: 3,
    completedItemsCount: 3,
    costoTotal: 2000,
    updatedAt: new Date('2024-01-02'),
    proyecto: {
      id: 'proj-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001'
    }
  }
];

const mockProps = {
  listas: mockListas,
  loading: false,
  error: null,
  viewMode: 'table' as const,
  showSelection: true,
  showActions: true,
  selectedIds: [],
  onSelectionChange: jest.fn(),
  onViewModeChange: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onView: jest.fn(),
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1
  },
  onPageChange: jest.fn()
};

describe('IndeterminateCheckbox in ListaEquipoMasterList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render checkbox in unchecked state when no items selected', () => {
    render(<ListaEquipoMasterList {...mockProps} />);
    
    const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las listas');
    expect(selectAllCheckbox).toBeInTheDocument();
    expect(selectAllCheckbox).not.toBeChecked();
  });

  it('should render checkbox in checked state when all items selected', () => {
    const propsWithAllSelected = {
      ...mockProps,
      selectedIds: ['1', '2']
    };
    
    render(<ListaEquipoMasterList {...propsWithAllSelected} />);
    
    const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las listas');
    expect(selectAllCheckbox).toBeChecked();
  });

  it('should render checkbox in indeterminate state when some items selected', () => {
    const propsWithPartialSelection = {
      ...mockProps,
      selectedIds: ['1']
    };
    
    render(<ListaEquipoMasterList {...propsWithPartialSelection} />);
    
    const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las listas');
    
    // Check that the underlying input has indeterminate property set
    const checkboxContainer = selectAllCheckbox.closest('[data-slot="checkbox"]');
    const inputElement = checkboxContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    
    expect(inputElement).toBeTruthy();
    expect(inputElement.indeterminate).toBe(true);
  });

  it('should call onSelectionChange when checkbox is clicked', () => {
    const mockOnSelectionChange = jest.fn();
    const propsWithHandler = {
      ...mockProps,
      onSelectionChange: mockOnSelectionChange
    };
    
    render(<ListaEquipoMasterList {...propsWithHandler} />);
    
    const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las listas');
    fireEvent.click(selectAllCheckbox);
    
    expect(mockOnSelectionChange).toHaveBeenCalled();
  });

  it('should toggle selection correctly from unchecked to all selected', () => {
    const mockOnSelectionChange = jest.fn();
    const propsWithHandler = {
      ...mockProps,
      onSelectionChange: mockOnSelectionChange
    };
    
    render(<ListaEquipoMasterList {...propsWithHandler} />);
    
    const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las listas');
    fireEvent.click(selectAllCheckbox);
    
    // Should be called with all IDs when selecting all
    expect(mockOnSelectionChange).toHaveBeenCalledWith(['1', '2']);
  });

  it('should toggle selection correctly from all selected to none', () => {
    const mockOnSelectionChange = jest.fn();
    const propsWithAllSelected = {
      ...mockProps,
      selectedIds: ['1', '2'],
      onSelectionChange: mockOnSelectionChange
    };
    
    render(<ListaEquipoMasterList {...propsWithAllSelected} />);
    
    const selectAllCheckbox = screen.getByLabelText('Seleccionar todas las listas');
    fireEvent.click(selectAllCheckbox);
    
    // Should be called with empty array when deselecting all
    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });
});
