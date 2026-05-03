import RecipeManagementClient, {
  type RecipeManagementRecipe,
} from './RecipeManagementClient';
import { prisma } from '@/lib/prisma';

const toStepArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
};

export default async function RecipeManagementPage() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      steps: true,
      imageUrl: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      isRecommended: true,
      recipeIngredients: {
        select: {
          ingredient: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          recipeIngredients: true,
          bookmarks: true,
          histories: true,
          mealPlans: true,
        },
      },
    },
  });

  const mappedRecipes: RecipeManagementRecipe[] = recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    steps: toStepArray(recipe.steps),
    createdBy: {
      id: 'system',
      name: 'SehatMok',
    },
    source: 'System',
    ingredients: recipe.recipeIngredients
      .map((relation) => relation.ingredient.name)
      .sort((firstName, secondName) => firstName.localeCompare(secondName)),
    ingredientCount: recipe._count.recipeIngredients,
    bookmarkCount: recipe._count.bookmarks,
    historyCount: recipe._count.histories,
    mealPlanCount: recipe._count.mealPlans,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    isRecommended: recipe.isRecommended,
    matchPercentage: null,
    createdDate: '-',
    image: recipe.imageUrl,
  }));

  return <RecipeManagementClient recipes={mappedRecipes} />;
}
