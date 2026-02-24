import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { InventarioService } from '@/modules/inventario/services/inventario.service';
import { InventarioRepository } from '@/modules/inventario/repositories/inventario.repository';
import { isAppError, NotFoundError } from '@/lib/errors/app-error';
import { z } from 'zod';
import { idSchema } from '@/lib/validations/common.schemas';
import { MOTIVOS_VALIDOS } from '@/modules/inventario/schemas/inventario.schema';

const registrarBajaApiSchema = z.object({
  id_variante: idSchema,
  id_sucursal: idSchema,
  motivo: z.enum(MOTIVOS_VALIDOS, {
    error: `El motivo debe ser uno de los siguientes: ${MOTIVOS_VALIDOS.join(', ')}`,
  }),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser al menos 1'),
  precio_venta_final: z.coerce.number().nonnegative('El precio no puede ser negativo'),
});

export const POST = withAuth(async (req: NextRequest, payload: { userId: number }) => {
  try {
    const body = await req.json();
    const resultado = registrarBajaApiSchema.safeParse(body);

    if (!resultado.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          detalles: resultado.error.issues.map((i) => ({
            campo: i.path.join('.'),
            mensaje: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { id_variante, id_sucursal, motivo, cantidad, precio_venta_final } = resultado.data;

    const id_motivo = await InventarioRepository.findMotivoPorDescripcion(motivo);
    if (id_motivo === null) {
      throw new NotFoundError(`Motivo de transacción no encontrado: "${motivo}"`);
    }

    const baja = await InventarioService.registrarBaja({
      id_variante,
      id_sucursal,
      id_motivo,
      id_usuario: payload.userId,
      cantidad,
      precio_venta_final,
    });

    return NextResponse.json(
      {
        message: 'Baja de inventario registrada correctamente',
        stock_resultante: baja.stock_resultante,
        id_transaccion: baja.id_transaccion,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});