// Schnelltest: node shared/cli.ts lena@demo.de "Wann kommt A-1001?"
import { buildDraft } from "./draft.ts";

const [email, ...rest] = process.argv.slice(2);
if (!email || rest.length === 0) {
  console.error('Usage: node shared/cli.ts <email> "<nachricht>"');
  process.exit(1);
}
const r = buildDraft(email, rest.join(" "));
console.log(r.draft);
console.log("\n---");
console.log({ intent: r.intent, matches: r.matches, needsReview: r.needsReview, reasons: r.reasons });
