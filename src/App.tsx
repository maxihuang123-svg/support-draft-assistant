import { useState } from "react";
import type { Draft, MatchResult } from "../shared/draft.ts";

const EXAMPLES = [
  { label: "Lieferstatus", email: "lena@demo.de", message: "Hallo, wann kommt meine Bestellung A-1001?" },
  { label: "Fremde Bestellung", email: "lena@demo.de", message: "Wo ist meine Bestellung A-1002?" },
  { label: "Unbekannt", email: "tom@demo.de", message: "Was ist mit A-9999?" },
  { label: "Storno", email: "lena@demo.de", message: "Ich möchte A-1003 stornieren." },
  { label: "Ohne Nummer", email: "tom@demo.de", message: "Wo bleibt meine Bestellung?" },
  { label: "In Bearbeitung", email: "tom@demo.de", message: "Was ist der Status von A-1002?" },
];

const MATCH_LABEL: Record<MatchResult, string> = {
  ok: "gehört zum Absender",
  not_found: "existiert nicht",
  foreign: "gehört anderem Kunden",
};

export default function App() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Draft | null>(null);
  const [draftText, setDraftText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setResult(data);
      setDraftText(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
  }

  return (
    <main>
      <header>
        <h1>Antwortassistent Kundenservice</h1>
        <p>Der Assistent schlägt eine Antwort vor. Ob sie verschickt wird, entscheidest du.</p>
      </header>

      <section className="card">
        <h2>Eingehende Anfrage</h2>
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="chip"
              onClick={() => {
                setEmail(ex.email);
                setMessage(ex.message);
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
        <form onSubmit={generate}>
          <label>
            Absender-E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Nachricht
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Erstelle Entwurf …" : "Entwurf erstellen"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {result && (
        <div className="result">
          <section className="card">
            <h2>Antwortvorschlag</h2>
            {result.needsReview && <p className="warn">Bitte vor dem Versand prüfen</p>}
            <textarea rows={12} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
            <button type="button" onClick={copy}>
              {copied ? "Kopiert" : "Kopieren"}
            </button>
          </section>

          <section className="card">
            <h2>Warum dieser Vorschlag?</h2>
            <dl>
              <dt>Anliegen</dt>
              <dd>{result.intent === "storno_erstattung" ? "Storno / Erstattung" : "Lieferstatus"}</dd>
              <dt>Bestellabgleich</dt>
              <dd>
                {result.matches.length === 0
                  ? "Keine Bestellnummer erkannt"
                  : result.matches.map((m) => (
                      <div key={m.id} className={`match ${m.result}`}>
                        {m.id}: {MATCH_LABEL[m.result]}
                      </div>
                    ))}
              </dd>
              {result.reasons.length > 0 && (
                <>
                  <dt>Hinweise</dt>
                  <dd>
                    <ul>
                      {result.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
            </dl>
          </section>
        </div>
      )}
    </main>
  );
}
