import { z } from "zod";

export const recipeIngredientSchema = z
  .object({
    name: z.string().trim().min(1),
    quantity: z.number().positive(),
    unit: z.string().trim().min(1),
  })
  .strict();

export const recipeSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    servings: z.number().int().min(1),
    cookTimeMinutes: z.number().int().min(1),
    ingredients: z.array(recipeIngredientSchema).min(1),
    steps: z.array(z.string().trim().min(1)).min(1),
    nutrition: z
      .object({
        calories: z.number().nonnegative(),
        protein: z.number().nonnegative(),
        carbs: z.number().nonnegative(),
        fat: z.number().nonnegative(),
        fiber: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const recipeCandidatesSchema = z
  .object({
    candidates: z.array(recipeSchema).min(3).max(5),
  })
  .strict();

export type RecipePayload = z.infer<typeof recipeSchema>;
export type RecipeCandidatesPayload = z.infer<typeof recipeCandidatesSchema>;
