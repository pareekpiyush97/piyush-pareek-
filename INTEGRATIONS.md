# Connecting Zrimat OS to WhatsApp & Instagram

The OS (`app.html`) already has the connection engine built in. It does two things once you
point it at a backend, under **Settings → Live connections**:

1. **Lead sync URL** — the OS fetches this on a timer and pulls new WhatsApp / Instagram
   leads into the same inbox (deduplicated).
2. **Send-message URL** — the WhatsApp button on a lead posts `{ to, text }` here, which
   sends the message through the WhatsApp Cloud API.

The OS is a static page, so it can't talk to Meta directly — it needs a tiny backend in the
middle. The cheapest, no-server option is **Make.com** (free tier) plus, optionally, a
**Google Sheet** as the store. Below is the exact path.

---

## What you need first (only you can do these — they need your accounts)

- A **Meta / Facebook developer account** → https://developers.facebook.com
- A **Facebook Page** and, for Instagram, an **Instagram Professional account** linked to that Page
- A **Make.com** account (free) → https://www.make.com
- 20–30 minutes

---

## Part A — WhatsApp (incoming leads + sending)

### 1. WhatsApp Cloud API app
1. developers.facebook.com → **Create App** → type **Business**.
2. Add the **WhatsApp** product. It gives you a test **Phone number ID** and a temporary token.
3. For real use, add your own number and generate a **permanent access token**
   (System User token with `whatsapp_business_messaging`).

### 2. Receive messages → Make.com
1. In Make, create a scenario. Add a **Custom webhook** trigger → copy its URL.
2. In the Meta app → **WhatsApp → Configuration → Webhook**, paste that URL, set a verify
   token, and **subscribe** to the `messages` field.
3. Now every incoming WhatsApp message hits your Make webhook. Add a module to **append a row**
   to a Google Sheet (columns below) — or store it in Make's Data Store.

**Sheet columns (header row, exactly these names):**
```
id | name | phone | source | message | date
```
Map from the webhook: `id` = message id, `name` = contact name, `phone` = wa_id,
`source` = `WhatsApp`, `message` = text body, `date` = timestamp.

### 3. Send messages ← the OS
1. New Make scenario with a **Custom webhook** trigger → copy its URL (this is your **Send URL**).
2. Add a **WhatsApp Business Cloud → Send a Message** module (or an HTTP POST to
   `https://graph.facebook.com/v20.0/<PHONE_NUMBER_ID>/messages` with your token).
   Map `to` = `{{to}}` and the text = `{{text}}` from the webhook body.
3. In the webhook response, return **CORS headers** so the browser is allowed to call it:
   `Access-Control-Allow-Origin: *`.

---

## Part B — Instagram (incoming DMs / leads)

1. In the same Meta app, add the **Instagram** product and connect your Instagram
   Professional account (via the linked Facebook Page).
2. Request the **`instagram_manage_messages`** permission. (This one needs Meta **App Review** —
   plan for a few days; until approved, only test users work.)
3. In **Webhooks**, subscribe your Instagram account to the `messages` field, pointing at the
   **same Make webhook** as WhatsApp (or a second one that writes to the same Sheet with
   `source` = `Instagram`).

Now WhatsApp and Instagram leads land in one Sheet → one inbox in the OS.

---

## Part C — point the OS at your backend

Open the OS → **Settings → Live connections**:

- **Lead sync URL:** either
  - your Google Sheet's read endpoint (open the Sheet → Share → *anyone with the link*, then use):
    ```
    https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&sheet=Sheet1
    ```
    (the OS understands this format directly), **or**
  - a Make webhook that returns the leads as a JSON array `[ {id,name,phone,source,message,date}, … ]`.
- **Send-message URL:** the Make **Send** webhook from Part A step 3.
- **Auto-sync every:** 60 seconds is fine.

Click **Test connection** → it should say *Reached — N lead(s) found*. Then **Save changes**.
The chip turns **Connected**, new leads start arriving on their own, and the WhatsApp button
now sends through the Cloud API (with a wa.me fallback if the send ever fails).

---

## Notes

- **Your data stays yours.** The OS keeps everything in your browser's local storage; the only
  outbound calls are to the two URLs you enter.
- **CORS** is the usual snag: the sync and send endpoints must return
  `Access-Control-Allow-Origin: *`. Google Sheets gviz already does; Make webhook responses need
  it set explicitly.
- **Cost:** WhatsApp Cloud API is free for service replies within 24h of a user message and for a
  monthly free tier of conversations; Instagram messaging is free but needs App Review.

Ask me and I'll sit with you through the Make.com scenario and the Meta setup step by step.
