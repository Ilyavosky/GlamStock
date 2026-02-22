import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { SucursalesService } from '@/modules/sucursales/services/sucursales.service';
import { isAppError } from '@/lib/errors/app-error';
import { idSchema } from '@/lib/validations/common.schemas';
import { inventarioQuerySchema } from '@/modules/inventario/schemas/inventario.schema';


export const GET = withAuth(async (req: NextRequest, _payload: unknown, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params;
        const idValidation = idSchema.safeParse(id);

        if (!idValidation.success) {
            return NextResponse.json({ error: 'ID de sucursal inválido' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);

        const rawParams: Record<string, string | undefined> = {
            sku: searchParams.get('sku') ?? undefined,
            nombre: searchParams.get('nombre') ?? undefined,
            min_stock: searchParams.get('min_stock') ?? undefined,
            max_stock: searchParams.get('max_stock') ?? undefined,
        };

        const cleanParams = Object.fromEntries(
            Object.entries(rawParams).filter(([, v]) => v !== undefined)
        );

        const validation = inventarioQuerySchema.safeParse(cleanParams);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Parámetros de consulta inválidos',
                    detalles: validation.error.issues.map(issue => ({
                        campo: issue.path.join('.'),
                        mensaje: issue.message,
                    })),
                },
                { status: 400 }
            );
        }

        const inventario = await SucursalesService.getInventarioByIdWithFilters(
            idValidation.data,
            validation.data
        );

        return NextResponse.json({ data: inventario, total: inventario.length }, { status: 200 });
    } catch (error) {
        if (isAppError(error)) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        console.error('Error en GET /api/sucursales/[id]/inventario:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});