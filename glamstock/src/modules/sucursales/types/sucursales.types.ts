//Interfaz para la sucursal
export interface Sucursal {
  id_sucursal: number;
  nombre_lugar: string;
  ubicacion: string;
  activo: boolean;
  created_at: Date;
}

//interfaz para crear sucursal
export interface CreateSucursalInput{
    nombre_lugar: string;
    ubicacion: string;
    activo?: boolean;
}

//interfaz para actualizar una sucursal
//el id y la fecha no se pueden actualizar pq no tiene sentido que lo hagan
export interface UpdateSucursalInput{
    nombre_lugar?: string;
    ubicacion?: string; 
    activo?: boolean;
}

//interfaz para eliminar una sucursal por medio de su id y nombre
export interface DeleteSucursalInput{
    id_sucursal: number;
    nombre_lugar: string;
}

export * from './sucursales.types';