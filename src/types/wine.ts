export type WineImageSource = "GPT" | "LABEL_SCAN" | "MANUAL";

export interface Wine {
  agingNotes: string | null;
  country: string | null;
  grapes: string[];
  guideScore: number | null;
  id: string;
  imageSource: WineImageSource | null;
  imageUrl: string | null;
  name: string;
  pairings: string[];
  price: string | null;
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
  | "guideScore"
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
