import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { ProductosService } from '@/modules/productos/services/productos.service';
import { isAppError } from '@/lib/errors/app-error';
import { paginationSchema } from '@/lib/validations/common.schemas';
import { crearProductoMaestroSchema } from '@/modules/productos/schemas/producto.schema';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    const validation = paginationSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parámetros de paginación inválidos', detalles: validation.error.format() },
        { status: 400 }
      );
    }

    const { page, limit } = validation.data;
    const resultado = await ProductosService.getAllProductos(page, limit);

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    const validation = crearProductoMaestroSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos de producto inválidos',
          detalles: validation.error.issues.map((i) => ({
            campo: i.path.join('.'),
            mensaje: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const producto = await ProductosService.createProductoCompleto(validation.data);
    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});