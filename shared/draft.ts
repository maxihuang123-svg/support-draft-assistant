// Kernlogik: Kundenanfrage -> Bestellabgleich -> Antwortvorschlag.
// Alles hier ist deterministisch. Was die Kundin erfährt, entscheidet nur dieser Code.

export type OrderStatus = "versendet" | "in Bearbeitung" | "zugestellt";

export type Order = {
  id: string;
  email: string;
  status: OrderStatus;
  date: string | null; // versendet: voraussichtliche Zustellung, zugestellt: Zustelldatum
};

export const ORDERS: Order[] = [
  { id: "A-1001", email: "lena@demo.de", status: "versendet", date: "26.10.2026" },
  { id: "A-1002", email: "tom@demo.de", status: "in Bearbeitung", date: null },
  { id: "A-1003", email: "lena@demo.de", status: "zugestellt", date: "20.10.2026" },
];

export type Intent = "status" | "storno_erstattung";

// "foreign" sieht nur der Mitarbeiter; im Entwurf werden not_found und foreign identisch behandelt.
export type MatchResult = "ok" | "not_found" | "foreign";

export type Draft = {
  draft: string;
  intent: Intent;
  orderIds: string[];
  matches: { id: string; result: MatchResult }[];
  needsReview: boolean;
  reasons: string[];
};

const ORDER_ID = /\bA[-\s]?(\d{4})\b/gi;
const STORNO = /storn|cancel|widerruf|erstatt|geld\s*zurück|zurück\s*(geben|schicken|senden)|rücksend|rückgabe|retour|umtausch/i;

export function extractOrderIds(message: string): string[] {
  const ids = [...message.matchAll(ORDER_ID)].map((m) => `A-${m[1]}`);
  return [...new Set(ids)];
}

export function detectIntent(message: string): Intent {
  return STORNO.test(message) ? "storno_erstattung" : "status";
}

function statusSentence(order: Order): string | null {
  switch (order.status) {
    case "versendet":
      return order.date
        ? `Ihre Bestellung ${order.id} ist versendet. Die Zustellung erfolgt voraussichtlich am ${order.date}.`
        : `Ihre Bestellung ${order.id} ist versendet. Ein genauer Zustelltermin liegt uns noch nicht vor.`;
    case "in Bearbeitung":
      return `Ihre Bestellung ${order.id} ist derzeit in Bearbeitung. Ein Liefertermin steht leider noch nicht fest.`;
    case "zugestellt":
      return order.date
        ? `Ihre Bestellung ${order.id} wurde laut unseren Daten am ${order.date} zugestellt.`
        : `Ihre Bestellung ${order.id} wurde laut unseren Daten zugestellt.`;
    default:
      return null; // unbekannter Status -> lieber nichts behaupten
  }
}

function notFoundSentence(id: string): string {
  return `Zur Bestellnummer ${id} konnten wir unter Ihrer E-Mail-Adresse leider keine Bestellung finden. Bitte prüfen Sie die Nummer oder schreiben Sie uns von der E-Mail-Adresse, mit der Sie bestellt haben.`;
}

export function buildDraft(senderEmail: string, message: string, orders: Order[] = ORDERS): Draft {
  const email = senderEmail.trim().toLowerCase();
  const intent = detectIntent(message);
  const orderIds = extractOrderIds(message);
  const reasons: string[] = [];
  const body: string[] = [];
  const matches: Draft["matches"] = [];
  let needsReview = false;

  if (intent === "storno_erstattung") {
    needsReview = true;
    reasons.push("Storno-/Erstattungswunsch erkannt: Entscheidung durch Kundenservice");
  }

  if (orderIds.length === 0) {
    reasons.push("Keine Bestellnummer gefunden: Rückfrage");
    body.push(
      "vielen Dank für Ihre Nachricht. Damit wir Ihnen weiterhelfen können, nennen Sie uns bitte Ihre Bestellnummer (z. B. A-1234)."
    );
    if (intent === "storno_erstattung") {
      body.push("Ihr Anliegen zur Stornierung bzw. Erstattung prüft anschließend unser Kundenservice.");
    }
  }

  for (const id of orderIds) {
    const order = orders.find((o) => o.id === id);
    if (!order) {
      matches.push({ id, result: "not_found" });
      reasons.push(`${id}: existiert nicht`);
      body.push(notFoundSentence(id));
      continue;
    }
    if (order.email.toLowerCase() !== email) {
      matches.push({ id, result: "foreign" });
      needsReview = true;
      reasons.push(`${id}: gehört nicht zum Absender, keine Daten preisgegeben`);
      body.push(notFoundSentence(id));
      continue;
    }

    matches.push({ id, result: "ok" });
    if (intent === "storno_erstattung") {
      body.push(
        `Ihren Wunsch zur Stornierung bzw. Erstattung der Bestellung ${id} haben wir erhalten. Unser Kundenservice prüft das Anliegen und meldet sich bei Ihnen. Bitte haben Sie Verständnis, dass wir dazu vorab keine Zusage machen können.`
      );
      continue;
    }
    const sentence = statusSentence(order);
    if (!sentence) {
      needsReview = true;
      reasons.push(`${id}: unbekannter Status "${order.status}"`);
      body.push(`Zu Ihrer Bestellung ${id} prüfen wir den aktuellen Stand und melden uns in Kürze bei Ihnen.`);
      continue;
    }
    body.push(sentence);
  }

  if (orderIds.length > 0 && !body[0].startsWith("vielen Dank")) {
    body.unshift("vielen Dank für Ihre Nachricht.");
  }

  const draft = ["Hallo,", "", body.join("\n\n"), "", "Viele Grüße", "Ihr Kundenservice"].join("\n");
  return { draft, intent, orderIds, matches, needsReview, reasons };
}
