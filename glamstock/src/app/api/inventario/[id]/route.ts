import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { isAppError } from '@/lib/errors/app-error';
import { idSchema } from '@/lib/validations/common.schemas';
import { InventarioRepository } from '@/modules/inventario/repositories/inventario.repository';
import { z } from 'zod';

const updateStockSchema = z.object({
  stock_actual: z.coerce.number().int().nonnegative('El stock no puede ser negativo'),
});

export const GET = withAuth(async (_req: NextRequest, _payload: unknown, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const idValidation = idSchema.safeParse(id);

    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID de inventario inválido' }, { status: 400 });
    }

    const registro = await InventarioRepository.findById(idValidation.data);

    if (!registro) {
      return NextResponse.json({ error: 'Registro de inventario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: registro }, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
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
        {
          error: 'Datos inválidos',
          detalles: validation.error.issues.map((i) => ({
            campo: i.path.join('.'),
            mensaje: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const registro = await InventarioRepository.updateStockById(idValidation.data, validation.data.stock_actual);

    if (!registro) {
      return NextResponse.json({ error: 'Registro de inventario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: registro }, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});