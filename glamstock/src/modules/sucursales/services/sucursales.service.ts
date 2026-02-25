import { SucursalesRepository } from '../repositories/sucursales.repository';
import { Sucursal, CreateSucursalInput, UpdateSucursalInput } from '../types/sucursales.types';
import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import { createSucursalSchema, updateSucursalSchema } from '../schemas/sucursales.schema';
import { InventarioDetallado } from '@/modules/inventario/types/inventario.types';

export class SucursalesService {

  static async getAllSucursales(soloActivas: boolean = false): Promise<Sucursal[]> {
    if (soloActivas) {
      return SucursalesRepository.findActivas();
    }
    return SucursalesRepository.findAll();
  }

  static async getSucursalById(id: number): Promise<Sucursal> {
    const sucursal = await SucursalesRepository.findById(id);
    if (!sucursal) {
      throw new NotFoundError('Sucursal no encontrada');
    }
    return sucursal;
  }

  static async createSucursal(data: CreateSucursalInput): Promise<Sucursal> {
    const validation = createSucursalSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues.map(i => i.message).join(', '));
    }

    const normalizado: CreateSucursalInput = {
      nombre_lugar: data.nombre_lugar.trim(),
      ubicacion: data.ubicacion.trim(),
      activo: true,
    };

    return SucursalesRepository.create(normalizado);
  }

  static async updateSucursal(id: number, data: UpdateSucursalInput): Promise<Sucursal> {
    const validation = updateSucursalSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues.map(i => i.message).join(', '));
    }

    await SucursalesService.getSucursalById(id);

    const normalizado: UpdateSucursalInput = {};

    if (data.nombre_lugar !== undefined) {
      normalizado.nombre_lugar = data.nombre_lugar.trim();
      if (normalizado.nombre_lugar.length < 2) {
        throw new ValidationError('El nombre debe tener al menos 2 caracteres');
      }
    }
    if (data.ubicacion !== undefined) {
      normalizado.ubicacion = data.ubicacion.trim();
      if (normalizado.ubicacion.length < 2) {
        throw new ValidationError('La ubicación debe tener al menos 2 caracteres');
      }
    }
    if (data.activo !== undefined) {
      normalizado.activo = data.activo;
    }

    return SucursalesRepository.update(id, normalizado);
  }

  static async deleteSucursal(id: number): Promise<void> {
    await SucursalesService.getSucursalById(id);
    await SucursalesRepository.delete(id);
  }

  static async toggleActivo(id: number): Promise<Sucursal> {
    const sucursal = await SucursalesService.getSucursalById(id);
    return SucursalesRepository.update(id, { activo: !sucursal.activo });
  }

  static async getInventarioByIdWithFilters(
    id: number,
    filtros: {
      sku?: string;
      nombre?: string;
      min_stock?: number;
      max_stock?: number;
    }
  ): Promise<InventarioDetallado[]> {
    await SucursalesService.getSucursalById(id);

    if (filtros.min_stock !== undefined && filtros.max_stock !== undefined) {
      if (filtros.min_stock > filtros.max_stock) {
        throw new ValidationError('El stock mínimo no puede ser mayor al stock máximo');
      }
    }

    if (filtros.min_stock !== undefined && filtros.min_stock < 0) {
      throw new ValidationError('El stock mínimo no puede ser negativo');
    }

    if (filtros.max_stock !== undefined && filtros.max_stock < 0) {
      throw new ValidationError('El stock máximo no puede ser negativo');
    }

    return SucursalesRepository.findByIdWithFilters(id, filtros);
  }
}