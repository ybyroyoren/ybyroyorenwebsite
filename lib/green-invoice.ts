import "server-only";

// חשבונית ירוקה / Green Invoice integration — issues a קבלה (receipt) after a
// payment succeeds. Uses Green Invoice's documented REST API:
// https://api.greeninvoice.co.il/api/v1

const API_BASE = "https://api.greeninvoice.co.il/api/v1";

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

let cachedToken: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expires * 1000 > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${API_BASE}/account/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: process.env.GREEN_INVOICE_API_KEY,
      secret: process.env.GREEN_INVOICE_API_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Green Invoice auth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { token: string; expires: number };
  cachedToken = data;
  return data.token;
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
      type: 300, // קבלה — Receipt
      lang: "he",
      currency: "ILS",
      vatType: 0,
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
