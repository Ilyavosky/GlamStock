import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { InventarioService } from '@/modules/inventario/services/inventario.service';
import { ajusteInventarioApiSchema } from '@/modules/inventario/schemas/inventario.schema';
import { isAppError } from '@/lib/errors/app-error';
import { JWTPayload } from '@/modules/auth/types/auth.types';

export const POST = withAuth(async (req: NextRequest, payload: JWTPayload) => {
  try {
    const body = await req.json();
    const resultado = ajusteInventarioApiSchema.safeParse(body);

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

    const { id_variante, id_sucursal, cantidad, motivo } = resultado.data;

    const ajuste = await InventarioService.executarAjustePorCantidad({
      id_variante,
      id_sucursal,
      cantidad,
      motivo,
      id_usuario: payload.userId,
    });

    return NextResponse.json(
      {
        message: 'Ajuste de inventario realizado correctamente',
        stock_nuevo: ajuste.stock_nuevo,
        id_transaccion: ajuste.id_transaccion,
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