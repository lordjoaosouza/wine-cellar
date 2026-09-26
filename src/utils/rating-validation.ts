import { z } from "zod";

import type { IntensityScore } from "@/types/wine";

const intensitySchema = z
  .number()
  .int()
  .min(1)
  .max(5)
  .transform((value) => value as IntensityScore);

function requiredNote(message: string) {
  return z.string().trim().min(1, message);
}

/**
 * The tasting form as typed, turned into what the API accepts. Mirrors the
 * server's upsertRatingSchema so a draft that passes here saves there, with
 * messages written for the person filling the form.
 */
export const ratingFormSchema = z.object({
  balance: intensitySchema,
  complexity: intensitySchema,
  conclusion: requiredNote("Sum up your impression of this bottle."),
  emotion: intensitySchema,
  intensity: intensitySchema,
  nose: requiredNote("Describe the aromas."),
  palate: requiredNote("Describe how it tastes."),
  persistence: intensitySchema,
  score: z
    .string()
    .trim()
    .min(1, "Enter a final score.")
    .transform((value) => Number(value.replace(",", ".")))
    .pipe(
      z
        .number("The score must be a number, like 8.5.")
        .min(0, "The score must be between 0 and 10.")
        .max(10, "The score must be between 0 and 10.")
    )
    .transform((value) => Math.round(value * 10) / 10),
  visual: requiredNote("Describe the color and look."),
});

export type RatingFormInput = z.input<typeof ratingFormSchema>;
export type RatingFormValues = z.output<typeof ratingFormSchema>;
export type RatingFormField = keyof RatingFormInput;
export type RatingFormErrors = Partial<Record<RatingFormField, string>>;

/** Either the values to save, or one message per field that needs attention. */
export function validateRatingForm(
  input: RatingFormInput
):
  | { success: true; values: RatingFormValues }
  | { success: false; errors: RatingFormErrors } {
  const result = ratingFormSchema.safeParse(input);
  if (result.success) {
    return { success: true, values: result.data };
  }
  const errors: RatingFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as RatingFormField;
    errors[field] ??= issue.message;
  }
  return { errors, success: false };
}
