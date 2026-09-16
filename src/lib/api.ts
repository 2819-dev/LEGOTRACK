export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, { status: 200, ...init });
}

export function jsonOkWithCookies<T>(data: T, setCookies: string[]) {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const cookie of setCookies) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(JSON.stringify(data), { status: 200, headers });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
