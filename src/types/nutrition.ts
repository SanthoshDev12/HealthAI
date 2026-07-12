import { z } from "zod";

/**
 * Full nutrition breakdown tracked by the platform.
 * Used for meal totals, food-database entries, and AI vision results.
 */
export const NutritionTotalsSchema = z.object({
  calories: z.number().int().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().default(0),
  sugar: z.number().nonnegative().default(0),
  sodium: z.number().int().nonnegative().default(0),
  potassium: z.number().nonnegative().default(0),
  iron: z.number().nonnegative().default(0),
  calcium: z.number().nonnegative().default(0),
  magnesium: z.number().nonnegative().default(0),
  vitaminA: z.number().nonnegative().default(0),
  vitaminB: z.number().nonnegative().default(0),
  vitaminC: z.number().nonnegative().default(0),
  vitaminD: z.number().nonnegative().default(0),
  vitaminE: z.number().nonnegative().default(0),
  vitaminK: z.number().nonnegative().default(0),
  omega3: z.number().nonnegative().default(0),
});

export type NutritionTotals = z.infer<typeof NutritionTotalsSchema>;

export const LoggedFoodSchema = z.object({
  foodId: z.string(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  quantityGrams: z.number().positive(),
  totals: NutritionTotalsSchema,
});

export type LoggedFood = z.infer<typeof LoggedFoodSchema>;

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
export const MealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof MealTypeSchema>;
