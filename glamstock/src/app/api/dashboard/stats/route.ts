import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/middleware/jwt.middleware';
import { DashboardService } from '@/modules/dashboard/services/dashboard.service';
import { dashboardQuerySchema } from '@/modules/dashboard/schemas/dashboard.schema';
import { isAppError } from '@/lib/errors/app-error';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Parsear y validar query params opcionales
    const rawParams: Record<string, string | undefined> = {
      fecha_inicio: searchParams.get('fecha_inicio') ?? undefined,
      fecha_fin: searchParams.get('fecha_fin') ?? undefined,
      top_limit: searchParams.get('top_limit') ?? undefined,
    };

    // Limpiar propiedades undefined para que Zod use defaults
    const cleanParams = Object.fromEntries(
      Object.entries(rawParams).filter(([, v]) => v !== undefined)
    );

    const validation = dashboardQuerySchema.safeParse(cleanParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parámetros de consulta inválidos',
          detalles: validation.error.issues.map((issue) => ({
            campo: issue.path.join('.'),
            mensaje: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { fecha_inicio, fecha_fin, top_limit } = validation.data;

    // 2. Obtener todas las métricas del dashboard
    const dashboard = await DashboardService.getDashboardCompleto({
      fecha_inicio,
      fecha_fin,
      top_limit,
    });

    return NextResponse.json({ data: dashboard }, { status: 200 });

  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error en GET /api/dashboard/stats:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});
