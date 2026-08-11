import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  addProductSize,
  createProduct,
  deleteProduct,
  deleteProductSize,
  removeProductImage,
  toggleSizeStock,
  updateProduct,
  updateProductSize,
  uploadProductImage,
} from "@/lib/actions/admin/products";
import styles from "../../admin.module.css";

const CATEGORIES = [
  { value: "desserts", label: "קינוחים" },
  { value: "spreads", label: "ממרחים" },
  { value: "frozen", label: "קפואים" },
  { value: "pasta", label: "פסטה" },
];

export default async function AdminProductsPage() {
  const admin = await requireAdminSection("products");
  const isOwner = admin.role === "owner";

  // Includes inactive products too (unlike the public getActiveProducts()).
  const db = supabaseAdmin();
  const { data: rows } = await db
    .from("products")
    .select(
      "id, slug, name, description, category, allergens, active, lead_time_days, image_urls, product_sizes(id, label, price_before_vat, stock_status)"
    )
    .order("sort_order", { ascending: true });

  const products = rows ?? [];

  return (
    <>
      <h1>מוצרים</h1>
      {!isOwner && <p className={styles.muted}>גישת מטבח: עדכון מלאי בלבד.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>מוצר חדש</h2>
          <form action={createProduct} className={styles.form}>
            <div className={styles.field}>
              <label>שם</label>
              <input name="name" type="text" required />
            </div>
            <div className={styles.field}>
              <label>קטגוריה</label>
              <select name="category" required>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>תיאור</label>
              <input name="description" type="text" />
            </div>
            <div className={styles.field}>
              <label>אלרגנים</label>
              <input name="allergens" type="text" />
            </div>
            <div className={styles.field}>
              <label>גודל ראשון</label>
              <input name="sizeLabel" type="text" placeholder='למשל: 500 גרם' required />
            </div>
            <div className={styles.field}>
              <label>מחיר לפני מע&quot;מ</label>
              <input name="sizePrice" type="number" step="0.01" min="0" required />
            </div>
            <div className={styles.field}>
              <label>ימי הכנה מראש</label>
              <input name="leadTimeDays" type="number" min="0" defaultValue={0} style={{ width: 80 }} />
            </div>
            <button type="submit" className={styles.btn}>
              הוספה
            </button>
          </form>
        </div>
      )}

      {products.map((product) => (
        <div key={product.id} className={styles.card}>
          {isOwner ? (
            <form action={updateProduct} className={styles.form}>
              <input type="hidden" name="id" value={product.id} />
              <div className={styles.field}>
                <label>שם</label>
                <input name="name" type="text" defaultValue={product.name} required />
              </div>
              <div className={styles.field}>
                <label>קטגוריה</label>
                <select name="category" defaultValue={product.category}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>תיאור</label>
                <input name="description" type="text" defaultValue={product.description} />
              </div>
              <div className={styles.field}>
                <label>אלרגנים</label>
                <input name="allergens" type="text" defaultValue={product.allergens} />
              </div>
              <div className={styles.field}>
                <label>ימי הכנה מראש</label>
                <input
                  name="leadTimeDays"
                  type="number"
                  min="0"
                  defaultValue={product.lead_time_days}
                  style={{ width: 80 }}
                />
              </div>
              <div className={styles.field}>
                <label>
                  <input type="checkbox" name="active" defaultChecked={product.active} /> פעיל
                </label>
              </div>
              <button type="submit" className={styles.btnSecondary}>
                שמירה
              </button>
            </form>
          ) : (
            <h2>{product.name}</h2>
          )}

          {isOwner && (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                {product.image_urls.map((url: string) => (
                  <div key={url} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6 }}
                    />
                    <form action={removeProductImage} style={{ marginTop: 4 }}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="url" value={url} />
                      <button type="submit" className={styles.btnDanger} style={{ width: "100%" }}>
                        מחיקה
                      </button>
                    </form>
                  </div>
                ))}
              </div>
              <form action={uploadProductImage} style={{ marginTop: 12 }}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="file" name="image" accept="image/*" required />
                <button type="submit" className={styles.btnSecondary} style={{ marginRight: 8 }}>
                  העלאת תמונה
                </button>
              </form>
            </>
          )}

          <table className={styles.table} style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>גודל</th>
                <th>מחיר (לפני מע&quot;מ)</th>
                <th>מלאי</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {product.product_sizes.map((size) => {
                const formId = `size-form-${size.id}`;
                return (
                  <tr key={size.id}>
                    {isOwner ? (
                      <>
                        <td>
                          <input form={formId} name="label" type="text" defaultValue={size.label} style={{ width: 120 }} />
                        </td>
                        <td>
                          <input
                            form={formId}
                            name="price"
                            type="number"
                            step="0.01"
                            defaultValue={size.price_before_vat}
                            style={{ width: 80 }}
                          />
                        </td>
                        <td>
                          <form action={toggleSizeStock}>
                            <input type="hidden" name="id" value={size.id} />
                            <input type="hidden" name="current" value={size.stock_status} />
                            <button
                              type="submit"
                              className={size.stock_status === "in_stock" ? styles.badgePaid : styles.badgePending}
                              style={{ border: "none", cursor: "pointer" }}
                            >
                              {size.stock_status === "in_stock" ? "במלאי" : "אזל"}
                            </button>
                          </form>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button form={formId} type="submit" className={styles.btnSecondary}>
                              שמירה
                            </button>
                            <button form={formId} formAction={deleteProductSize} type="submit" className={styles.btnDanger}>
                              מחיקה
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{size.label}</td>
                        <td>₪{size.price_before_vat}</td>
                        <td>
                          <form action={toggleSizeStock}>
                            <input type="hidden" name="id" value={size.id} />
                            <input type="hidden" name="current" value={size.stock_status} />
                            <button
                              type="submit"
                              className={size.stock_status === "in_stock" ? styles.badgePaid : styles.badgePending}
                              style={{ border: "none", cursor: "pointer" }}
                            >
                              {size.stock_status === "in_stock" ? "במלאי" : "אזל"}
                            </button>
                          </form>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {isOwner &&
            product.product_sizes.map((size) => (
              <form key={size.id} id={`size-form-${size.id}`} action={updateProductSize} style={{ display: "none" }}>
                <input type="hidden" name="id" value={size.id} />
              </form>
            ))}

          {isOwner && (
            <>
              <form action={addProductSize} className={styles.form} style={{ marginTop: 12 }}>
                <input type="hidden" name="productId" value={product.id} />
                <div className={styles.field}>
                  <label>גודל חדש</label>
                  <input name="label" type="text" style={{ width: 120 }} />
                </div>
                <div className={styles.field}>
                  <label>מחיר</label>
                  <input name="price" type="number" step="0.01" min="0" style={{ width: 90 }} />
                </div>
                <button type="submit" className={styles.btnSecondary}>
                  הוספת גודל
                </button>
              </form>

              <form action={deleteProduct} style={{ marginTop: 12 }}>
                <input type="hidden" name="id" value={product.id} />
                <button type="submit" className={styles.btnDanger}>
                  מחיקת מוצר
                </button>
              </form>
            </>
          )}
        </div>
      ))}
    </>
  );
}
