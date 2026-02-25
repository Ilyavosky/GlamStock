import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { InventarioService } from '@/modules/inventario/services/inventario.service';
import { isAppError } from '@/lib/errors/app-error';
import { idSchema } from '@/lib/validations/common.schemas';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const rawSucursalId = searchParams.get('sucursal_id');

    if (!rawSucursalId) {
      return NextResponse.json(
        { error: 'El parámetro sucursal_id es requerido. Uso: /api/inventario?sucursal_id=1' },
        { status: 400 }
      );
    }

    const idValidation = idSchema.safeParse(rawSucursalId);

    if (!idValidation.success) {
      return NextResponse.json(
        { error: `El parámetro sucursal_id debe ser un número entero positivo. Recibido: "${rawSucursalId}"` },
        { status: 400 }
      );
    }

    const inventario = await InventarioService.getInventarioBySucursal(idValidation.data);

    return NextResponse.json(
      { data: inventario, total: inventario.length, sucursal_id: idValidation.data },
      { status: 200 }
    );
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});