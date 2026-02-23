import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { VariantesService } from '@/modules/productos/services/variantes.service';
import { AppError } from '@/lib/errors/app-error';
import { idSchema } from '@/lib/validations/common.schemas';
import { z } from 'zod';

const updateVarianteSchema = z.object({
  precio_adquisicion: z.coerce.number().nonnegative('El precio no puede ser negativo').optional(),
  precio_venta_etiqueta: z.coerce.number().nonnegative('El precio no puede ser negativo').optional(),
  modelo: z.string().max(100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  codigo_barras: z.string().min(3).max(100).optional(),
  sku_variante: z.string().min(3).max(100).optional(),
});

export const GET = withAuth(async (req: NextRequest, _payload: unknown, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const validation = idSchema.safeParse(id);
    if (!validation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { VariantesRepository } = await import('@/modules/productos/repositories/variantes.repository');
    const variante = await VariantesRepository.findById(validation.data);

    if (!variante) {
      return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: variante }, { status: 200 });
  } catch (error) {
    console.error('Error GET /api/variantes/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, _payload: unknown, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const idValidation = idSchema.safeParse(id);

    if (!idValidation.success) {
      return NextResponse.json({ error: 'ID de variante inválido' }, { status: 400 });
    }

    const body = await req.json();
    const validation = updateVarianteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: validation.error.format() },
        { status: 400 }
      );
    }

    const variante = await VariantesService.updateVariante(idValidation.data, validation.data);
    return NextResponse.json(variante);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});