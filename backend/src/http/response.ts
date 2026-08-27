export interface JsonResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const baseHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
};

export const json = (statusCode: number, payload: unknown): JsonResponse => ({
  statusCode,
  headers: baseHeaders,
  body: JSON.stringify(payload),
});

