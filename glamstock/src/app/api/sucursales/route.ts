import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { SucursalesService } from '@/modules/sucursales/services/sucursales.service';
import { isAppError } from '@/lib/errors/app-error';

export const GET = withAuth(async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const soloActivas = searchParams.get('activas') === 'true';

        const sucursales = await SucursalesService.getAllSucursales(soloActivas);

        return NextResponse.json({ data: sucursales, total: sucursales.length }, { status: 200 });
    } catch (error) {
        if (isAppError(error)) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        console.error('Error en GET /api/sucursales:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});

export const POST = withAuth(async (req: NextRequest) => {
    try {
        const body = await req.json();
        const sucursal = await SucursalesService.createSucursal(body);

        return NextResponse.json({ data: sucursal }, { status: 201 });
    } catch (error) {
        if (isAppError(error)) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode });
        }
        console.error('Error en POST /api/sucursales:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});