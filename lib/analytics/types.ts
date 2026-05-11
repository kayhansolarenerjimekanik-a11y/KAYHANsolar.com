export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "offer_submit"
  | "search_query"
  | "chat_message";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  pageUrl?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

export interface DailyCount {
  date: string; // ISO YYYY-MM-DD
  count: number;
}

export interface TopProduct {
  productId: string;
  count: number;
}
