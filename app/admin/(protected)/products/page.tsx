import { requireAdminSection } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getCategories } from "@/lib/categories";
import { getAllergens } from "@/lib/allergens";
import { todayIsraelIso } from "@/lib/date";
import { tagTextColor } from "@/lib/allergenTags";
import {
  addProductSize,
  attachProductImage,
  createAllergen,
  createCategory,
  createProduct,
  deleteAllergen,
  deleteCategory,
  deleteProduct,
  deleteProductSize,
  moveProduct,
  moveProductImage,
  moveProductSize,
  setDefaultSize,
  getProductImageUploadTicket,
  removeProductImage,
  toggleSizeStock,
  updateAllergen,
  updateCategory,
  updateProduct,
  updateProductSize,
} from "@/lib/actions/admin/products";
import { OrderButtons } from "@/components/admin/OrderButtons";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import styles from "../../admin.module.css";

export default async function AdminProductsPage() {
  const admin = await requireAdminSection("products");
  const isOwner = admin.role === "owner";

  // Includes inactive products too (unlike the public getActiveProducts()).
  const db = supabaseAdmin();
  const [{ data: rows }, categories, allergens] = await Promise.all([
    db
      .from("products")
      .select(
        "id, slug, name, name_en, description, description_en, active, lead_time_days, daily_limit, image_urls, product_categories(category_id), product_allergens(allergen_id), product_sizes(id, label, price_before_vat, stock_status, stock_qty, sort_order, is_default)"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    getCategories(),
    getAllergens(),
  ]);

  // Sizes in the owner's order (stable sort: ties keep the database order).
  const products = (rows ?? []).map((p) => ({
    ...p,
    product_sizes: [...p.product_sizes].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const productOrder = products.map((p) => p.id).join(",");
  // Units left per size (for sizes with a stock quantity) and units already ordered per product per pickup date.
  const [{ data: stockRows }, { data: usageRows }] = await Promise.all([
    db.from("product_size_stock").select("product_size_id, remaining"),
    db.from("product_day_usage").select("product_id, pickup_date, qty").gte("pickup_date", todayIsraelIso()).order("pickup_date"),
  ]);
  const remainingBySize = new Map((stockRows ?? []).map((r) => [r.product_size_id as string, Number(r.remaining)]));
  const usageByProduct = new Map<string, { date: string; qty: number }[]>();
  for (const u of usageRows ?? []) usageByProduct.set(u.product_id, [...(usageByProduct.get(u.product_id) ?? []), { date: u.pickup_date, qty: Number(u.qty) }]);
  // How many products sit in each category (a product can be in several).
  const categoryCount = new Map<string, number>();
  for (const p of products) for (const pc of p.product_categories) categoryCount.set(pc.category_id, (categoryCount.get(pc.category_id) ?? 0) + 1);

  return (
    <>
      <h1>מוצרים</h1>
      {!isOwner && <p className={styles.muted}>גישת מטבח: עדכון מלאי בלבד.</p>}

      {isOwner && (
        <div className={styles.card}>
          <h2>קטגוריות</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>עברית</th>
                <th>אנגלית</th>
                <th>צבע</th>
                <th>מוצרים</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const formId = `category-form-${c.id}`;
                const count = categoryCount.get(c.id) ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <input form={formId} name="labelHe" type="text" defaultValue={c.labelHe} required style={{ width: 130 }} />
                    </td>
                    <td>
                      <input form={formId} name="labelEn" type="text" defaultValue={c.labelEn} required style={{ width: 130 }} />
                    </td>
                    <td>
                      <input form={formId} name="color" type="color" defaultValue={c.color} aria-label="צבע" />
                    </td>
                    <td>{count}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button form={formId} type="submit" className={styles.btnSecondary}>
                          שמירה
                        </button>
                        <form action={deleteCategory}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmButton
                            className={styles.btnDanger}
                            message={
                              count > 0
                                ? `למחוק את הקטגוריה "${c.labelHe}"? ${count} מוצרים נמצאים בה כרגע; הם יישארו בחנות ויוסרו רק מהקטגוריה הזו.`
                                : `למחוק את הקטגוריה "${c.labelHe}"?`
                            }
                          >
                            מחיקה
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {categories.map((c) => (
            <form key={c.id} id={`category-form-${c.id}`} action={updateCategory} style={{ display: "none" }}>
              <input type="hidden" name="id" value={c.id} />
            </form>
          ))}
          <p className={styles.sectionNote}>מחיקת קטגוריה מסירה אותה מהמוצרים שבה, והמוצרים עצמם נשארים בחנות.</p>
          <form action={createCategory} className={styles.form} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <label>שם הקטגוריה (עברית)</label>
              <input name="labelHe" type="text" required />
            </div>
            <div className={styles.field}>
              <label>שם הקטגוריה (אנגלית)</label>
              <input name="labelEn" type="text" required />
            </div>
            <div className={styles.field}>
              <label>צבע</label>
              <input name="color" type="color" defaultValue="#efe8d8" />
            </div>
            <button type="submit" className={styles.btn}>
              הוספת קטגוריה
            </button>
          </form>
        </div>
      )}

      {isOwner && (
        <div className={styles.card}>
          <h2>אלרגנים (תגיות)</h2>
          <p className={styles.sectionNote}>
            רשימת האלרגנים שאפשר לסמן בכל מוצר. לכל תגית צבע משלה, והיא מופיעה באתר ומשמשת לסינון בחנות. מחיקת תגית מסירה אותה מכל המוצרים.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>עברית</th>
                <th>אנגלית</th>
                <th>צבע</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allergens.map((a) => {
                const formId = `allergen-form-${a.id}`;
                return (
                  <tr key={a.id}>
                    <td>
                      <input form={formId} name="labelHe" type="text" defaultValue={a.labelHe} required style={{ width: 130 }} />
                    </td>
                    <td>
                      <input form={formId} name="labelEn" type="text" defaultValue={a.labelEn} style={{ width: 130 }} />
                    </td>
                    <td>
                      <input form={formId} name="color" type="color" defaultValue={a.color} aria-label="צבע" />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button form={formId} type="submit" className={styles.btnSecondary}>
                          שמירה
                        </button>
                        <button form={formId} formAction={deleteAllergen} type="submit" className={styles.btnDanger}>
                          מחיקה
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {allergens.map((a) => (
            <form key={a.id} id={`allergen-form-${a.id}`} action={updateAllergen} style={{ display: "none" }}>
              <input type="hidden" name="id" value={a.id} />
            </form>
          ))}
          <form action={createAllergen} className={styles.form} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <label>אלרגן חדש (עברית)</label>
              <input name="labelHe" type="text" required />
            </div>
            <div className={styles.field}>
              <label>אנגלית</label>
              <input name="labelEn" type="text" />
            </div>
            <div className={styles.field}>
              <label>צבע</label>
              <input name="color" type="color" defaultValue="#c9923a" />
            </div>
            <button type="submit" className={styles.btn}>
              הוספת אלרגן
            </button>
          </form>
        </div>
      )}

      {isOwner && products.length > 1 && (
        <div className={styles.card}>
          <h2>סדר המוצרים בחנות</h2>
          <p className={styles.sectionNote}>המוצר העליון מופיע ראשון בחנות (בכל קטגוריה לפי אותו סדר יחסי).</p>
          <ol className={styles.orderList}>
            {products.map((product, i) => (
              <li key={product.id} className={styles.orderItem}>
                <span className={styles.orderName}>
                  {product.name}
                  {!product.active && <span className={styles.muted}> (לא פעיל)</span>}
                </span>
                <OrderButtons
                  action={moveProduct}
                  id={product.id}
                  order={productOrder}
                  isFirst={i === 0}
                  isLast={i === products.length - 1}
                  label={product.name}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      {isOwner && (
        <div className={styles.card}>
          <h2>מוצר חדש</h2>
          <form action={createProduct} className={styles.form}>
            <div className={styles.field}>
              <label>שם (עברית)</label>
              <input name="name" type="text" required />
            </div>
            <div className={styles.field}>
              <label>שם (אנגלית)</label>
              <input name="nameEn" type="text" />
            </div>
            <div className={styles.field} style={{ flexBasis: "100%" }}>
              <label>קטגוריות (אפשר כמה)</label>
              <div className={styles.tagPicker}>
                {categories.map((c) => (
                  <label key={c.id} className={styles.catOption}>
                    <input type="checkbox" name="categoryIds" value={c.id} />
                    <span>{c.labelHe}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label>תיאור (עברית)</label>
              <input name="description" type="text" />
            </div>
            <div className={styles.field}>
              <label>תיאור (אנגלית)</label>
              <input name="descriptionEn" type="text" />
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
                <label>שם (עברית)</label>
                <input name="name" type="text" defaultValue={product.name} required />
              </div>
              <div className={styles.field}>
                <label>שם (אנגלית)</label>
                <input name="nameEn" type="text" defaultValue={product.name_en ?? ""} />
              </div>
              <div className={styles.field} style={{ flexBasis: "100%" }}>
                <label>קטגוריות (אפשר כמה)</label>
                <div className={styles.tagPicker}>
                  {categories.map((c) => (
                    <label key={c.id} className={styles.catOption}>
                      <input
                        type="checkbox"
                        name="categoryIds"
                        value={c.id}
                        defaultChecked={product.product_categories.some((pc) => pc.category_id === c.id)}
                      />
                      <span>{c.labelHe}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label>תיאור (עברית)</label>
                <input name="description" type="text" defaultValue={product.description} />
              </div>
              <div className={styles.field}>
                <label>תיאור (אנגלית)</label>
                <input name="descriptionEn" type="text" defaultValue={product.description_en ?? ""} />
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
                <label>מקסימום ליום איסוף</label>
                <input
                  name="dailyLimit"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={product.daily_limit ?? ""}
                  placeholder="ללא הגבלה"
                  style={{ width: 120 }}
                />
                <small className={styles.hint}>כמה יחידות מהמוצר (כל הגדלים יחד) אפשר להזמין לתאריך איסוף אחד. ריק = בלי הגבלה.</small>
              </div>
              {allergens.length > 0 && (
                <div className={styles.field} style={{ flexBasis: "100%" }}>
                  <label>אלרגנים</label>
                  <div className={styles.tagPicker}>
                    {allergens.map((a) => (
                      <label key={a.id} className={styles.tagOption}>
                        <input
                          type="checkbox"
                          name="allergenIds"
                          value={a.id}
                          defaultChecked={product.product_allergens.some((pa) => pa.allergen_id === a.id)}
                        />
                        <span style={{ background: a.color, color: tagTextColor(a.color) }}>{a.labelHe}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
                {product.image_urls.map((url: string, imgIdx: number) => (
                  <div key={url} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6 }}
                    />
                    {product.image_urls.length > 1 && (
                      <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                        <div className={styles.orderButtons}>
                          {(["up", "down"] as const).map((direction) => (
                            <form key={direction} action={moveProductImage}>
                              <input type="hidden" name="productId" value={product.id} />
                              <input type="hidden" name="index" value={imgIdx} />
                              <input type="hidden" name="direction" value={direction} />
                              <button
                                type="submit"
                                className={styles.orderBtn}
                                disabled={direction === "up" ? imgIdx === 0 : imgIdx === product.image_urls.length - 1}
                                aria-label={direction === "up" ? "הזזה אחורה (מוקדם יותר)" : "הזזה קדימה (מאוחר יותר)"}
                              >
                                {direction === "up" ? "→" : "←"}
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    )}
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
              <div style={{ marginTop: 12 }}>
                <ImageUploadButton
                  label="העלאת תמונה"
                  getTicket={getProductImageUploadTicket.bind(null, product.id)}
                  onUploaded={attachProductImage.bind(null, product.id)}
                />
              </div>
            </>
          )}

          <table className={styles.table} style={{ marginTop: 16 }}>
            <thead>
              <tr>
                {isOwner && <th>סדר</th>}
                <th>גודל</th>
                <th>מחיר (לפני מע&quot;מ)</th>
                <th>מלאי</th>
                {isOwner && <th>כמות במלאי</th>}
                {isOwner && <th>ברירת מחדל</th>}
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {product.product_sizes.map((size, sizeIdx) => {
                const formId = `size-form-${size.id}`;
                const sizeOrder = product.product_sizes.map((x) => x.id).join(",");
                // The shop preselects the size marked as default, else the first one.
                const isDefault = size.is_default || (!product.product_sizes.some((x) => x.is_default) && sizeIdx === 0);
                return (
                  <tr key={size.id}>
                    {isOwner ? (
                      <>
                        <td>
                          <OrderButtons
                            action={moveProductSize}
                            id={size.id}
                            order={sizeOrder}
                            extra={{ productId: product.id }}
                            isFirst={sizeIdx === 0}
                            isLast={sizeIdx === product.product_sizes.length - 1}
                            label={size.label}
                          />
                        </td>
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
                          <input
                            form={formId}
                            name="stockQty"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={size.stock_qty ?? ""}
                            placeholder="ללא הגבלה"
                            style={{ width: 110 }}
                          />
                          {remainingBySize.has(size.id) && (
                            <div className={styles.muted}>
                              {Math.max(0, remainingBySize.get(size.id)!) === 0 ? "אזל, הכמות נגמרה" : `נשארו ${remainingBySize.get(size.id)}`}
                            </div>
                          )}
                        </td>
                        <td>
                          {isDefault ? (
                            <span className={styles.badgePaid}>ברירת מחדל</span>
                          ) : (
                            <form action={setDefaultSize}>
                              <input type="hidden" name="id" value={size.id} />
                              <input type="hidden" name="productId" value={product.id} />
                              <button type="submit" className={styles.btnSecondary}>
                                קבע כברירת מחדל
                              </button>
                            </form>
                          )}
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

          {isOwner && product.daily_limit !== null && (
            <p className={styles.sectionNote} style={{ marginTop: 10 }}>
              <b>מגבלה יומית: {product.daily_limit} ליום איסוף.</b>{" "}
              {(usageByProduct.get(product.id) ?? []).length === 0
                ? "אין עדיין הזמנות לתאריכים הקרובים."
                : (usageByProduct.get(product.id) ?? [])
                    .slice(0, 14)
                    .map((u) => `${u.date.split("-").reverse().slice(0, 2).join(".")}: ${u.qty}/${product.daily_limit}${u.qty >= (product.daily_limit ?? 0) ? " (מלא)" : ""}`)
                    .join(" · ")}
            </p>
          )}

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
