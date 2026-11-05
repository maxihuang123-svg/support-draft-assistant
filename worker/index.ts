import { buildDraft } from "../shared/draft.ts";

const MAX_MESSAGE = 5000;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/draft") {
      if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

      const body = (await request.json().catch(() => null)) as { email?: unknown; message?: unknown } | null;
      const email = typeof body?.email === "string" ? body.email.trim() : "";
      const message = typeof body?.message === "string" ? body.message.trim() : "";

      if (!email || !message) return Response.json({ error: "E-Mail und Nachricht sind erforderlich" }, { status: 400 });
      if (message.length > MAX_MESSAGE) return Response.json({ error: "Nachricht zu lang" }, { status: 400 });

      return Response.json(buildDraft(email, message));
    }

    return new Response("Not found", { status: 404 });
  },
};
