/**
 * 🧪 Route Parameters Validator Tests
 * 
 * Comprehensive test suite for route parameter validation utilities.
 * Tests validation schemas, error handling, and utility functions.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import {
  RouteParamsValidator,
  validateRouteParams,
  RouteValidationError,
  routeGuards,
  proyectoParamsSchema,
  listaEquipoDetailParamsSchema,
  listSearchParamsSchema
} from '@/lib/validators/routeParams';

describe('RouteParamsValidator', () => {
  // ✅ Valid test data
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '987fcdeb-51a2-43d1-9f12-123456789abc';
  const invalidUUID = 'invalid-uuid';
  
  const validProyectoParams = { id: validUUID };
  const validListaEquipoParams = { id: validUUID, listaId: validUUID2 };
  
  describe('Schema Validation', () => {
    describe('proyectoParamsSchema', () => {
      it('should validate valid proyecto parameters', () => {
        const result = proyectoParamsSchema.safeParse(validProyectoParams);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(validUUID);
        }
      });
      
      it('should reject invalid UUID', () => {
        const result = proyectoParamsSchema.safeParse({ id: invalidUUID });
        expect(result.success).toBe(false);
      });
      
      it('should reject missing id', () => {
        const result = proyectoParamsSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
    
    describe('listaEquipoDetailParamsSchema', () => {
      it('should validate valid lista equipo parameters', () => {
        const result = listaEquipoDetailParamsSchema.safeParse(validListaEquipoParams);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(validUUID);
          expect(result.data.listaId).toBe(validUUID2);
        }
      });
      
      it('should reject invalid proyecto ID', () => {
        const result = listaEquipoDetailParamsSchema.safeParse({
          id: invalidUUID,
          listaId: validUUID2
        });
        expect(result.success).toBe(false);
      });
      
      it('should reject invalid lista ID', () => {
        const result = listaEquipoDetailParamsSchema.safeParse({
          id: validUUID,
          listaId: invalidUUID
        });
        expect(result.success).toBe(false);
      });
      
      it('should reject missing parameters', () => {
        const result = listaEquipoDetailParamsSchema.safeParse({ id: validUUID });
        expect(result.success).toBe(false);
      });
    });
    
    describe('listSearchParamsSchema', () => {
      it('should validate valid search parameters', () => {
        const params = {
          page: '2',
          limit: '20',
          search: 'test',
          sort: 'nombre',
          order: 'desc',
          estado: 'ACTIVO'
        };
        
        const result = listSearchParamsSchema.safeParse(params);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(2);
          expect(result.data.limit).toBe(20);
          expect(result.data.search).toBe('test');
          expect(result.data.sort).toBe('nombre');
          expect(result.data.order).toBe('desc');
          expect(result.data.estado).toBe('ACTIVO');
        }
      });
      
      it('should apply default values for missing parameters', () => {
        const result = listSearchParamsSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(10);
          expect(result.data.sort).toBe('nombre');
          expect(result.data.order).toBe('asc');
        }
      });
      
      it('should coerce string numbers to numbers', () => {
        const result = listSearchParamsSchema.safeParse({ page: '5', limit: '25' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(5);
          expect(result.data.limit).toBe(25);
        }
      });
      
      it('should reject invalid sort values', () => {
        const result = listSearchParamsSchema.safeParse({ sort: 'invalid' });
        expect(result.success).toBe(false);
      });
      
      it('should reject invalid order values', () => {
        const result = listSearchParamsSchema.safeParse({ order: 'invalid' });
        expect(result.success).toBe(false);
      });
      
      it('should reject page less than 1', () => {
        const result = listSearchParamsSchema.safeParse({ page: '0' });
        expect(result.success).toBe(false);
      });
      
      it('should reject limit greater than 100', () => {
        const result = listSearchParamsSchema.safeParse({ limit: '101' });
        expect(result.success).toBe(false);
      });
    });
  });
  
  describe('Validation Methods', () => {
    describe('validateProyectoParams', () => {
      it('should validate valid proyecto parameters', () => {
        const result = RouteParamsValidator.validateProyectoParams(validProyectoParams);
        expect(result.id).toBe(validUUID);
      });
      
      it('should throw error for invalid parameters', () => {
        expect(() => {
          RouteParamsValidator.validateProyectoParams({ id: invalidUUID });
        }).toThrow('Parámetros de proyecto inválidos');
      });
    });
    
    describe('validateListaEquipoDetailParams', () => {
      it('should validate valid lista equipo parameters', () => {
        const result = RouteParamsValidator.validateListaEquipoDetailParams(validListaEquipoParams);
        expect(result.id).toBe(validUUID);
        expect(result.listaId).toBe(validUUID2);
      });
      
      it('should throw error for invalid parameters', () => {
        expect(() => {
          RouteParamsValidator.validateListaEquipoDetailParams({ id: invalidUUID, listaId: validUUID2 });
        }).toThrow('Parámetros de lista de equipos inválidos');
      });
    });
    
    describe('validateListSearchParams', () => {
      it('should validate valid search parameters', () => {
        const params = { page: '2', limit: '20', search: 'test' };
        const result = RouteParamsValidator.validateListSearchParams(params);
        expect(result.page).toBe(2);
        expect(result.limit).toBe(20);
        expect(result.search).toBe('test');
      });
      
      it('should return defaults for invalid parameters', () => {
        const result = RouteParamsValidator.validateListSearchParams({ page: 'invalid' });
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.sort).toBe('nombre');
        expect(result.order).toBe('asc');
      });
    });
  });
  
  describe('Safe Validation', () => {
    describe('safeValidate', () => {
      it('should return success for valid data', () => {
        const result = RouteParamsValidator.safeValidate(
          proyectoParamsSchema,
          validProyectoParams
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(validUUID);
        }
      });
      
      it('should return error for invalid data', () => {
        const result = RouteParamsValidator.safeValidate(
          proyectoParamsSchema,
          { id: invalidUUID }
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('ID debe ser un UUID válido');
        }
      });
      
      it('should handle unknown errors', () => {
        const mockSchema = {
          parse: jest.fn().mockImplementation(() => {
            throw new Error('Unknown error');
          })
        } as any;
        
        const result = RouteParamsValidator.safeValidate(mockSchema, {});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Error de validación desconocido');
        }
      });
    });
  });
  
  describe('UUID Validation', () => {
    describe('isValidUUID', () => {
      it('should return true for valid UUIDs', () => {
        const validUUIDs = [
          '123e4567-e89b-12d3-a456-426614174000',
          '987fcdeb-51a2-43d1-9f12-123456789abc',
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
        ];
        
        validUUIDs.forEach(uuid => {
          expect(RouteParamsValidator.isValidUUID(uuid)).toBe(true);
        });
      });
      
      it('should return false for invalid UUIDs', () => {
        const invalidUUIDs = [
          'invalid-uuid',
          '123e4567-e89b-12d3-a456',
          '123e4567-e89b-12d3-a456-426614174000-extra',
          '',
          '123e4567e89b12d3a456426614174000', // No hyphens
          '123e4567-e89b-12d3-a456-42661417400g' // Invalid character
        ];
        
        invalidUUIDs.forEach(uuid => {
          expect(RouteParamsValidator.isValidUUID(uuid)).toBe(false);
        });
      });
    });
  });
  
  describe('Parameter Sanitization', () => {
    describe('sanitizeParams', () => {
      it('should sanitize string parameters', () => {
        const params = {
          id: '  ' + validUUID + '  ',
          name: '  test name  '
        };
        
        const result = RouteParamsValidator.sanitizeParams(params);
        expect(result.id).toBe(validUUID);
        expect(result.name).toBe('test name');
      });
      
      it('should handle array parameters', () => {
        const params = {
          id: [validUUID, 'extra'],
          tags: ['  tag1  ', 'tag2']
        };
        
        const result = RouteParamsValidator.sanitizeParams(params);
        expect(result.id).toBe(validUUID);
        expect(result.tags).toBe('tag1');
      });
      
      it('should handle empty arrays', () => {
        const params = {
          id: validUUID,
          empty: []
        };
        
        const result = RouteParamsValidator.sanitizeParams(params);
        expect(result.id).toBe(validUUID);
        expect(result.empty).toBeUndefined();
      });
    });
  });
});

describe('validateRouteParams', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '987fcdeb-51a2-43d1-9f12-123456789abc';
  const invalidUUID = 'invalid-uuid';
  
  describe('proyecto', () => {
    it('should validate and return valid proyecto parameters', () => {
      const result = validateRouteParams.proyecto({ id: validUUID });
      expect(result.id).toBe(validUUID);
    });
    
    it('should throw error for invalid proyecto parameters', () => {
      expect(() => {
        validateRouteParams.proyecto({ id: invalidUUID });
      }).toThrow('Proyecto no válido');
    });
  });
  
  describe('listaEquipoDetail', () => {
    it('should validate and return valid lista equipo parameters', () => {
      const result = validateRouteParams.listaEquipoDetail({
        id: validUUID,
        listaId: validUUID2
      });
      expect(result.id).toBe(validUUID);
      expect(result.listaId).toBe(validUUID2);
    });
    
    it('should throw error for invalid lista equipo parameters', () => {
      expect(() => {
        validateRouteParams.listaEquipoDetail({
          id: invalidUUID,
          listaId: validUUID2
        });
      }).toThrow('Lista de equipos no válida');
    });
  });
});

describe('RouteValidationError', () => {
  it('should create error with default code', () => {
    const error = new RouteValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('INVALID_PARAMS');
    expect(error.name).toBe('RouteValidationError');
  });
  
  it('should create error with custom code', () => {
    const error = new RouteValidationError('Test error', 'UNAUTHORIZED');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('UNAUTHORIZED');
  });
});

describe('routeGuards', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUID2 = '987fcdeb-51a2-43d1-9f12-123456789abc';
  const invalidUUID = 'invalid-uuid';
  
  describe('requireProyectoAccess', () => {
    it('should return true for valid proyecto ID', () => {
      const result = routeGuards.requireProyectoAccess(validUUID);
      expect(result).toBe(true);
    });
    
    it('should throw error for invalid proyecto ID', () => {
      expect(() => {
        routeGuards.requireProyectoAccess(invalidUUID);
      }).toThrow(RouteValidationError);
      
      expect(() => {
        routeGuards.requireProyectoAccess(invalidUUID);
      }).toThrow('ID de proyecto inválido');
    });
    
    it('should work with user role parameter', () => {
      const result = routeGuards.requireProyectoAccess(validUUID, 'admin');
      expect(result).toBe(true);
    });
  });
  
  describe('requireListaEquipoAccess', () => {
    it('should return true for valid IDs', () => {
      const result = routeGuards.requireListaEquipoAccess(validUUID, validUUID2);
      expect(result).toBe(true);
    });
    
    it('should throw error for invalid proyecto ID', () => {
      expect(() => {
        routeGuards.requireListaEquipoAccess(invalidUUID, validUUID2);
      }).toThrow('ID de proyecto inválido');
    });
    
    it('should throw error for invalid lista ID', () => {
      expect(() => {
        routeGuards.requireListaEquipoAccess(validUUID, invalidUUID);
      }).toThrow('ID de lista inválido');
    });
    
    it('should work with user role parameter', () => {
      const result = routeGuards.requireListaEquipoAccess(validUUID, validUUID2, 'admin');
      expect(result).toBe(true);
    });
  });
});
