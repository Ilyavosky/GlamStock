import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/modules/inventario/services/inventario.service';
import { verifyToken } from '@/modules/auth/middleware/jwt.middleware';
import { isAppError } from '@/lib/errors/app-error';
import { z } from 'zod';
import { idSchema } from '@/lib/validations/common.schemas';
import { MOTIVOS_VALIDOS } from '@/modules/inventario/schemas/inventario.schema';
import { db } from '@/lib/db/client';
import { NotFoundError } from '@/lib/errors/app-error';

const registrarBajaApiSchema = z.object({
  id_variante: idSchema,
  id_sucursal: idSchema,
  motivo: z.enum(MOTIVOS_VALIDOS, {
    error: `El motivo debe ser uno de los siguientes: ${MOTIVOS_VALIDOS.join(', ')}`,
  }),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser al menos 1'),
  precio_venta_final: z.coerce.number().nonnegative('El precio no puede ser negativo'),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const payload = verifyToken(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parsear y validar el body con Zod
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

    // 3. Resolver id_motivo a partir del texto del motivo
    const motivoQuery = `SELECT id_motivo FROM motivos_transaccion WHERE descripcion = $1;`;
    const { rows: motivoRows } = await db.query(motivoQuery, [motivo]);

    if (motivoRows.length === 0) {
      throw new NotFoundError(`Motivo de transacción no encontrado: "${motivo}"`);
    }
    const id_motivo: number = motivoRows[0].id_motivo;

    // 4. Registrar la baja (valida stock internamente, lanza ValidationError si insuficiente)
    const baja = await InventarioService.registrarBaja({
      id_variante,
      id_sucursal,
      id_motivo,
      id_usuario: payload.userId,
      cantidad,
      precio_venta_final,
    });

    console.log(
      `[INVENTARIO] BAJA | variante=${id_variante} sucursal=${id_sucursal} ` +
      `cantidad=${cantidad} motivo="${motivo}" usuario=${payload.userId} ` +
      `stock_resultante=${baja.stock_resultante} transaccion=${baja.id_transaccion}`
    );

    // 5. Retornar respuesta con stock resultante
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
    console.error('Error en POST /api/inventario/baja:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
