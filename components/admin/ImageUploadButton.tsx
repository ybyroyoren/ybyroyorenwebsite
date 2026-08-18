"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { UploadTicket } from "@/lib/storage";
import styles from "@/app/admin/admin.module.css";

// Uploads a file straight from the browser to Supabase Storage via a
// signed URL (see lib/storage.ts for why: Vercel's serverless functions
// silently reject bodies over ~4.5MB, which real photos routinely exceed).
// getTicket/onUploaded are Server Actions, typically passed in pre-bound to
// an id via Function.prototype.bind, e.g.
// getTicket={getProductImageUploadTicket.bind(null, product.id)}.
export function ImageUploadButton({
  label,
  getTicket,
  onUploaded,
}: {
  label: string;
  getTicket: (filename: string) => Promise<UploadTicket | null>;
  onUploaded: (url: string) => Promise<void>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("יש להעלות קובץ תמונה");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const ticket = await getTicket(file.name);
      if (!ticket) throw new Error("אין הרשאה להעלאה");

      const { error: uploadError } = await supabaseBrowser()
        .storage.from("images")
        .uploadToSignedUrl(ticket.path, ticket.token, file);
      if (uploadError) throw new Error(uploadError.message);

      await onUploaded(ticket.publicUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ההעלאה נכשלה, נסו שוב");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={uploading}
        style={{ display: "none" }}
      />
      <button
        type="button"
        className={styles.btnSecondary}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "מעלה..." : label}
      </button>
      {error && (
        <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
