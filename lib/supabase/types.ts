// Hand-written to match supabase/migrations/0001_init.sql.
// If the schema changes, update this alongside the migration — there's no
// live Supabase project yet to run `supabase gen types` against.

export type StockStatus = "in_stock" | "out_of_stock";
export type OrderStatus = "pending" | "paid" | "cancelled";
export type RegistrationStatus = "pending" | "paid" | "cancelled";
export type NewsletterSource = "footer" | "events_form";
export type AdminRole = "owner" | "kitchen" | "sales";
export type MealStatus = "open" | "closed";

export interface MealMenuItem {
  name: string;
  note: string;
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          category: string;
          allergens: string;
          image_urls: string[];
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          slug: string;
          name: string;
          category: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      product_sizes: {
        Row: {
          id: string;
          product_id: string;
          label: string;
          price_before_vat: number;
          stock_status: StockStatus;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["product_sizes"]["Row"]> & {
          product_id: string;
          label: string;
          price_before_vat: number;
        };
        Update: Partial<Database["public"]["Tables"]["product_sizes"]["Row"]>;
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_pct: number;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["coupons"]["Row"]> & {
          code: string;
          discount_pct: number;
        };
        Update: Partial<Database["public"]["Tables"]["coupons"]["Row"]>;
      };
      carts: {
        Row: {
          id: string;
          session_user_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["carts"]["Row"]> & {
          session_user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["carts"]["Row"]>;
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_size_id: string;
          qty: number;
        };
        Insert: Partial<Database["public"]["Tables"]["cart_items"]["Row"]> & {
          cart_id: string;
          product_size_id: string;
          qty: number;
        };
        Update: Partial<Database["public"]["Tables"]["cart_items"]["Row"]>;
      };
      orders: {
        Row: {
          id: string;
          cart_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          pickup_date: string;
          notes: string;
          coupon_id: string | null;
          subtotal: number;
          vat: number;
          discount: number;
          total: number;
          status: OrderStatus;
          grow_payment_id: string | null;
          receipt_doc_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          pickup_date: string;
          subtotal: number;
          vat: number;
          total: number;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_name: string;
          size_label: string;
          unit_price: number;
          qty: number;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]> & {
          order_id: string;
          product_name: string;
          unit_price: number;
          qty: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
      };
      meals: {
        Row: {
          id: string;
          title: string;
          description: string;
          date: string;
          total_seats: number;
          price_per_seat: number;
          menu: MealMenuItem[];
          status: MealStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meals"]["Row"]> & {
          title: string;
          date: string;
          total_seats: number;
          price_per_seat: number;
        };
        Update: Partial<Database["public"]["Tables"]["meals"]["Row"]>;
      };
      meal_registrations: {
        Row: {
          id: string;
          meal_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          seats_count: number;
          deposit_total: number;
          status: RegistrationStatus;
          grow_payment_id: string | null;
          receipt_doc_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_registrations"]["Row"]> & {
          meal_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          seats_count: number;
          deposit_total: number;
        };
        Update: Partial<Database["public"]["Tables"]["meal_registrations"]["Row"]>;
      };
      meal_diners: {
        Row: {
          id: string;
          registration_id: string;
          full_name: string;
          dietary_restrictions: string[];
          notes: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_diners"]["Row"]> & {
          registration_id: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_diners"]["Row"]>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          source: NewsletterSource;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Row"]> & {
          email: string;
          source: NewsletterSource;
        };
        Update: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Row"]>;
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string;
          message: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contact_messages"]["Row"]> & {
          name: string;
          phone: string;
          email: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_messages"]["Row"]>;
      };
      admin_profiles: {
        Row: {
          id: string;
          role: AdminRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["admin_profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_profiles"]["Row"]>;
      };
    };
    Views: {
      meal_availability: {
        Row: {
          meal_id: string;
          total_seats: number;
          taken_seats: number;
          remaining_seats: number;
        };
      };
    };
  };
}
