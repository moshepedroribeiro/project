import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

/**
 * Error handler global do Express.
 *
 * Captura todos os erros lançados nos controllers/services
 * e retorna uma resposta JSON padronizada.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...('details' in err ? { details: (err as any).details } : {}),
      },
    });
    return;
  }

  // Erro inesperado — não vaza detalhes internos
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor',
    },
  });
}
