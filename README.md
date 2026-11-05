# Antwortassistent Kundenservice

Live: https://support-draft-assistant.maxi-huang1234.workers.dev

Der Assistent gleicht eine Kundenanfrage mit den Bestelldaten ab und schlägt dem Mitarbeiter eine Antwort vor. Versendet wird nichts automatisch: Der Mitarbeiter kann den Entwurf bearbeiten, kopieren und selbst entscheiden.

## Konzept

### 1. Wie kommst du von einer Kundenanfrage zu den richtigen Bestelldaten und einem Antwortvorschlag?
1. Bestellnummer aus der Nachricht extrahieren (`A-1001`, `a1001`, `A 1001`)
2. Bestellung nachschlagen
3. Prüfen, ob die Absender-E-Mail zur Bestellung gehört
4. Anliegen erkennen: Lieferstatus oder Storno/Erstattung
5. Antwort aus geprüften Feldern zusammensetzen
6. Mitarbeiter sieht Entwurf und Begründung (Anliegen, Bestellabgleich, Hinweise) und entscheidet

### 2. Welche Schritte würdest du mit normalem Code lösen und wo wäre KI sinnvoll?
- Alles, was über Daten und Freigabe entscheidet, ist deterministischer Code: Extraktion, Lookup, Besitzprüfung, Eskalation. Diese Schritte müssen nachvollziehbar und testbar sein; ein Sprachmodell darf hier nichts entscheiden.
- KI wäre sinnvoll für (a) die Erkennung des Anliegens, wenn Kunden es ohne Schlüsselwort formulieren („Ich brauche die Bestellung doch nicht mehr“ ist ein Storno, enthält aber kein „storn“), und (b) einen natürlicheren Ton der Antwort. Das Modell bekäme dabei nur die bereits freigegebenen Fakten, nie die gesamte Bestelltabelle, und dürfte eine Eskalation nur auslösen, nie aufheben.
- In dieser Version ist bewusst noch kein LLM eingebaut: Der Kern funktioniert vollständig ohne und bleibt der Fallback.

### 3. Wie gehst du mit fehlenden Angaben, falschen Daten oder kritischen Kundenwünschen um?
- Keine Bestellnummer: Rückfrage. Bestellungen werden nicht anhand der Absender-Adresse aufgelistet, da Absender fälschbar sind.
- Unbekannte und fremde Bestellnummer: identische, neutrale Antwort. So lässt sich nicht herausfinden, ob eine Nummer existiert. Intern sieht der Mitarbeiter den Unterschied, eine fremde Bestellung wird zur Prüfung markiert.
- Storno/Erstattung: Der Assistent entscheidet das nie selbst. Der Entwurf bestätigt nur den Eingang und verweist auf die Prüfung durch den Kundenservice, ohne Zusage; der Mitarbeiter sieht zusätzlich den Hinweis „Bitte vor dem Versand prüfen“.
- Kein Liefertermin oder unbekannter Status: nichts erfinden; unbekannter Status wird zur Prüfung markiert.

### Bekannte Grenzen
- Storno-Erkennung arbeitet mit Schlüsselwörtern und übersieht indirekte Formulierungen (siehe KI-Erweiterung oben).
- Die E-Mail-Adresse wird als Identitätsnachweis genommen; in echt müsste der Absender verifiziert sein (z. B. Abgleich mit dem Mail-Header bzw. SPF/DKIM im Ticketsystem).

## Technik

- `shared/draft.ts`: Kernlogik und Beispieldaten (reine Funktion `buildDraft(email, message)`)
- `worker/index.ts`: Cloudflare Worker, `POST /api/draft`
- `src/App.tsx`: React-Oberfläche (Vite)

```
npm install
npm test          # 7 Testfälle
npm run dev       # lokal: http://localhost:5173
npm run deploy    # Cloudflare Workers
npm run draft -- lena@demo.de "Wann kommt A-1001?"
```
