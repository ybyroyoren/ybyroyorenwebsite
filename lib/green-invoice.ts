import "server-only";

// חשבונית ירוקה / Green Invoice integration — issues a חשבונית מס/קבלה
// (tax invoice + receipt, type 320) after a payment succeeds. Roy is עוסק
// מורשה (VAT-registered), and payment happens at the same moment as the
// sale, so 320 is the legally correct document — not 300, which is a plain
// "חשבון עסקה" (proforma/transaction record), not a real tax receipt.
// The service is now branded "morning": auth moved to the OAuth endpoint below
// (the old /account/token returns 404), the documents API base is unchanged.
// Docs: https://developers.morning.co/api

const API_BASE = "https://api.greeninvoice.co.il/api/v1";
const AUTH_URL = "https://api.morning.co/idp/v1/oauth/token";

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface IssueReceiptParams {
  customerName: string;
  customerEmail: string;
  items: ReceiptLineItem[];
  total: number;
}

export interface IssueReceiptResult {
  documentId: string;
  documentUrl: string | null;
}

const isConfigured = () =>
  Boolean(process.env.GREEN_INVOICE_API_KEY && process.env.GREEN_INVOICE_API_SECRET);

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.GREEN_INVOICE_API_KEY,
      client_secret: process.env.GREEN_INVOICE_API_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Green Invoice auth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { accessToken?: string; access_token?: string; expires_in?: number };
  const token = data.accessToken ?? data.access_token;
  if (!token) throw new Error("Green Invoice auth failed: no access token in response");
  cachedToken = { token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token;
}

export async function issueReceipt(params: IssueReceiptParams): Promise<IssueReceiptResult> {
  if (!isConfigured()) {
    console.warn(
      `[green-invoice] Not configured — skipping receipt for ${params.customerEmail} (total ₪${params.total}).`
    );
    return { documentId: `unconfigured-${Date.now()}`, documentUrl: null };
  }

  const token = await getToken();

  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 320, // חשבונית מס/קבלה — Tax Invoice + Receipt
      lang: "he",
      currency: "ILS",
      vatType: 0,
      // emails → morning emails the customer a link to the document;
      // attachment → the PDF is attached to that email as well.
      attachment: true,
      client: {
        name: params.customerName,
        emails: [params.customerEmail],
      },
      income: params.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: item.unitPrice,
        currency: "ILS",
        vatType: 0,
      })),
      payment: [
        {
          type: 3, // כרטיס אשראי
          price: params.total,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Green Invoice document creation failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { id: string | number; url?: { origin?: string; he?: string; en?: string } };
  return {
    documentId: String(data.id),
    documentUrl: data.url?.he ?? data.url?.origin ?? null,
  };
}
