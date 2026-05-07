import { z, type ZodSchema } from 'zod';

export { z };

/**
 * Parse and validate a request body against a Zod schema.
 * Returns typed data on success, or a 400 Response on failure.
 * Usage: const result = await parseBody(req, schema); if (result instanceof Response) return result;
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T | Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: result.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return result.data;
}
