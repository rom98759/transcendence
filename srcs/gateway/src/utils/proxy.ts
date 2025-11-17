import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export async function proxyRequest(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  url: string,
  init?: RequestInit
) {
  const response: Response = await (app as any).fetchInternal(request, url, init || {
    headers: { "Content-Type": "application/json" },
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    reply.header("set-cookie", setCookie);
  }

  const contentType = response.headers.get("content-type") || "";

  // Log proxied request and response status
  const userName = (request.headers as any)["x-user-name"] || null;
  app.log.info({ event: 'proxy', url, method: init?.method || 'GET', status: response.status, user: userName });

  // Forward status code Service -> Gateway -> Client
  reply.code(response.status);

  if (contentType.includes("application/json")) {
    const body = await response.json();
    if (response.status >= 400) {
      if (body && body.error) {
        return body;
      }
      return { error: { message: body?.message || 'Upstream error', code: 'UPSTREAM_ERROR', upstreamStatus: response.status } };
    }
    return body;
  }
  const text = await response.text();
  if (response.status >= 400) {
    return { error: { message: text || 'Upstream error', code: 'UPSTREAM_ERROR', upstreamStatus: response.status } };
  }
  return text;
}
