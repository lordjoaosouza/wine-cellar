/** WEB: a store's catalog photo; LABEL_SCAN: the photo taken to identify it. */
export type WineImageSource = "WEB" | "LABEL_SCAN";

/** A store listing the price was computed from, in the store's own currency. */
export interface WineOffer {
  amount: number;
  amountBrl: number;
  country: string;
  currency: string;
  store: string;
  url: string;
}

/** BR = Brazilian stores; INTERNATIONAL = stores abroad, converted to BRL. */
export type WinePriceMarket = "BR" | "INTERNATIONAL";

export interface Wine {
  agingNotes: string | null;
  country: string | null;
  grapes: string[];
  id: string;
  imageSource: WineImageSource | null;
  imageUrl: string | null;
  name: string;
  offers: WineOffer[];
  pairings: string[];
  price: string | null;
  priceMarket: WinePriceMarket | null;
  producerProfile: string | null;
  region: string | null;
  regionProfile: string | null;
  servingNotes: string | null;
  tastingNotes: string | null;
  type: string | null;
  vintage: string | null;
  winery: string | null;
}

export type WineDetail = Wine;

export type WineSearchResult = Pick<
  Wine,
  | "id"
  | "name"
  | "vintage"
  | "type"
  | "winery"
  | "region"
  | "country"
  | "imageUrl"
  | "imageSource"
>;

export interface WineSearchResponse {
  results: WineSearchResult[];
  total: number;
}

export type WineRecentView = Wine & { viewedAt: string };
export type WineWishlistItem = Wine & { savedAt: string };
export type WineCellarItem = Wine & { savedAt: string; quantity: number };

export type IntensityScore = 1 | 2 | 3 | 4 | 5;

export type WineRating = Wine & {
  wineId: string;
  savedAt: string;
  score: number;
  balance: IntensityScore;
  complexity: IntensityScore;
  intensity: IntensityScore;
  persistence: IntensityScore;
  emotion: IntensityScore;
  visual: string;
  nose: string;
  palate: string;
  conclusion: string;
  photoUrl: string | null;
};
