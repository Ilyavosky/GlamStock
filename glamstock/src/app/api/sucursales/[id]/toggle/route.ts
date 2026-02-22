import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { SucursalesService } from '@/modules/sucursales/services/sucursales.service';
import { isAppError } from '@/lib/errors/app-error';
import { idSchema } from '@/lib/validations/common.schemas';

export const PATCH = withAuth(async (_req: NextRequest, _payload: unknown, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const idValidation = idSchema.safeParse(id);

        if (!idValidation.success) {
            return NextResponse.json({ error: 'ID de sucursal inválido' }, { status: 400 });
        }

        const sucursal = await SucursalesService.toggleActivo(idValidation.data);
        return NextResponse.json({ data: sucursal }, { status: 200 });
    } catch (error) {
        if (isAppError(error)) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        console.error('Error en PATCH /api/sucursales/[id]/toggle:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});