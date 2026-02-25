import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { VariantesService } from '@/modules/productos/services/variantes.service';
import { isAppError } from '@/lib/errors/app-error';
import { z } from 'zod';
import { varianteSchema } from '@/modules/productos/schemas/producto.schema';

// Schema para agregar variante: hereda de varianteSchema pero requiere id_producto_maestro
const agregarVarianteSchema = varianteSchema.extend({
  id_producto_maestro: z.coerce.number().int().positive(),
});

// Agregar variante a un producto existente
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    
    // Validar input
    const validation = agregarVarianteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de variante inválidos', detalles: validation.error.format() },
        { status: 400 }
      );
    }

    const { id_producto_maestro, ...varianteData } = validation.data;
    
    const nuevaVariante = await VariantesService.addVariante(id_producto_maestro, varianteData);
    
    return NextResponse.json(nuevaVariante, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});