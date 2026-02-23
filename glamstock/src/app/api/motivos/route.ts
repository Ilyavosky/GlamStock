import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { db } from '@/lib/db/client';
import { isAppError } from '@/lib/errors/app-error';

export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const { rows } = await db.query(
      'SELECT id_motivo, descripcion FROM motivos_transaccion ORDER BY id_motivo;'
    );
    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en GET /api/motivos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});