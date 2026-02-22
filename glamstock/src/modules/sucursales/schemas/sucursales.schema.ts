import { z } from "zod";
import { CreateSucursalInput, UpdateSucursalInput, DeleteSucursalInput } from "../types/sucursales.types";

export const sucursalSchema = z.object({
    nombre_lugar: z.string().min(2).max(100),
    ubicacion: z.string().min(2).max(255),
    activo: z.boolean().default(true),
    created_at: z.date().optional(),
});

export const createSucursalSchema = z.object({
    nombre_lugar: z.string().min(2).max(100),
    ubicacion: z.string().min(2).max(255),
});

export const updateSucursalSchema = z.object({
    nombre_lugar: z.string().min(2).max(100).optional(),
    ubicacion: z.string().min(2).max(255).optional(),
    activo: z.boolean().optional(),
});

export const deleteSucursalSchema = z.object({
    id_sucursal: z.coerce.number().int().positive('Debe especificar una sucursal'),
});

export type { CreateSucursalInput as CreateSucursalDTO };
export type { UpdateSucursalInput as UpdateSucursalDTO };
export type { DeleteSucursalInput as DeleteSucursalDTO };