import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { AppError } from '@/lib/errors/app-error';
import { idSchema } from '@/lib/validations/common.schemas';
import { db } from '@/lib/db/client';
import { z } from 'zod';

const updateStockSchema = z.object({
  stock_actual: z.coerce.number().int().nonnegative('El stock no puede ser negativo'),
});

export const PUT = withAuth(async (req: NextRequest, _payload: unknown, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const idValidation = idSchema.safeParse(id);

    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID de inventario inválido' }, { status: 400 });
    }

    const body = await req.json();
    const validation = updateStockSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: validation.error.format() },
        { status: 400 }
      );
    }

    const { stock_actual } = validation.data;

    const query = `
      UPDATE inventario_sucursal
      SET stock_actual = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_inventario = $2
      RETURNING id_inventario, id_variante, id_sucursal, stock_actual, updated_at;
    `;
    const { rows } = await db.query(query, [stock_actual, idValidation.data]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Registro de inventario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});