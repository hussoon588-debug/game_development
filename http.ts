export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, ...data }, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ ok: false, error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
  console.error("[api]", message);
  return Response.json({ ok: false, error: "تعذر إتمام العملية، حاول مرة أخرى" }, { status: 500 });
}

export async function withApi<T>(handler: () => Promise<T>) {
  try {
    const data = await handler();
    return Response.json({ ok: true, ...data });
  } catch (error) {
    return errorResponse(error);
  }
}

export function asNumber(value: unknown, field = "المبلغ"): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new ApiError(`${field} غير صالح`);
  return n;
}

export function requireAmount(value: unknown, field = "المبلغ"): number {
  const n = asNumber(value, field);
  if (n <= 0) throw new ApiError(`${field} يجب أن يكون أكبر من صفر`);
  if (n > 5_000_000) throw new ApiError(`${field} يتجاوز الحد المسموح`);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function str(value: unknown, field: string, max = 400): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new ApiError(`${field} مطلوب`);
  if (s.length > max) throw new ApiError(`${field} طويل جداً`);
  return s;
}

export function optionalStr(value: unknown, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}
