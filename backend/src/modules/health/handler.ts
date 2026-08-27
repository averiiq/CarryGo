import { json, JsonResponse } from '../../http/response';

export const handleHealth = (): JsonResponse =>
  json(200, {
    status: 'ok',
    service: 'carrygo-backend',
    timestamp: new Date().toISOString(),
  });

