import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { verifyToken } from '@/modules/auth/middleware/jwt.middleware';
import { isAppError } from '@/lib/errors/app-error';

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const payload = verifyToken(req);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Consultar sucursales activas
    const query = `
      SELECT id_sucursal, nombre_lugar, ubicacion, activo, created_at
      FROM sucursales
      WHERE activo = TRUE
      ORDER BY nombre_lugar;
    `;
    const { rows } = await db.query(query);

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en GET /api/inventario/sucursales:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
