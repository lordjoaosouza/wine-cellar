import { apiClient } from "@/services/api-client";
import { createLocalCollection } from "@/services/local-store";
import type { IntensityScore, WineRating } from "@/types/wine";
import { toImageDataUri } from "@/utils/image-data-uri";

export const emptyRatingDraft = {
  balance: 3 as IntensityScore,
  complexity: 3 as IntensityScore,
  conclusion: "",
  emotion: 3 as IntensityScore,
  intensity: 3 as IntensityScore,
  nose: "",
  palate: "",
  persistence: 3 as IntensityScore,
  photoUri: null as string | null,
  score: "",
  visual: "",
};

const ratingsCache = createLocalCollection<WineRating>({
  getId: (rating) => rating.wineId,
  key: "@wine-cellar:ratings-cache:v2",
});

export async function getRatings(): Promise<WineRating[]> {
  try {
    const ratings = await apiClient.get<WineRating[]>("/ratings");
    await ratingsCache.saveMany(ratings);
    return ratings;
  } catch {
    return ratingsCache.list();
  }
}

export async function getRating(wineId: string): Promise<WineRating | null> {
  try {
    const rating = await apiClient.get<WineRating | null>(`/ratings/${wineId}`);
    if (rating) {
      await ratingsCache.save(rating);
    }
    return rating;
  } catch {
    return ratingsCache.get(wineId);
  }
}

interface RatingInput {
  balance: IntensityScore;
  complexity: IntensityScore;
  conclusion: string;
  emotion: IntensityScore;
  intensity: IntensityScore;
  nose: string;
  palate: string;
  persistence: IntensityScore;
  score: number;
  visual: string;
}

export async function saveRating(
  wineId: string,
  input: RatingInput
): Promise<WineRating> {
  const rating = await apiClient.put<WineRating>(`/ratings/${wineId}`, input);
  await ratingsCache.save(rating);
  return rating;
}

export async function uploadRatingPhoto(
  wineId: string,
  fileUri: string
): Promise<WineRating> {
  const rating = await apiClient.post<WineRating>(`/ratings/${wineId}/photo`, {
    image: await toImageDataUri(fileUri),
  });
  await ratingsCache.save(rating);
  return rating;
}

export async function removeRating(wineId: string): Promise<void> {
  await apiClient.delete(`/ratings/${wineId}`);
  await ratingsCache.remove(wineId);
}
