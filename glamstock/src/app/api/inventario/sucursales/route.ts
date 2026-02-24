import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { SucursalesRepository } from '@/modules/sucursales/repositories/sucursales.repository';
import { isAppError } from '@/lib/errors/app-error';

export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const sucursales = await SucursalesRepository.findActivas();
    return NextResponse.json({ data: sucursales }, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});