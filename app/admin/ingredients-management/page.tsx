import IngredientsManagementClient, {
  type IngredientsManagementIngredient,
} from './IngredientsManagementClient';
import { prisma } from '@/lib/prisma';

const getIngredientIcon = (name: string) => {
  const normalizedName = name.trim().toLowerCase();

  if (/(egg|eggs)/.test(normalizedName)) {
    return 'egg_alt';
  }

  if (/(spinach|carrot|lettuce|broccoli|vegetable|vegetables)/.test(normalizedName)) {
    return 'eco';
  }

  if (/(milk|yogurt|cheese|dairy)/.test(normalizedName)) {
    return 'local_drink';
  }

  if (/(rice|quinoa|grain|oat|wheat|pasta)/.test(normalizedName)) {
    return 'grain';
  }

  if (/(chicken|beef|salmon|fish|meat|tofu)/.test(normalizedName)) {
    return 'nutrition';
  }

  return 'restaurant';
};

export default async function IngredientsManagementPage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      caloriesPer100: true,
      proteinPer100: true,
      carbsPer100: true,
      fatPer100: true,
      _count: {
        select: {
          recipeRelations: true,
        },
      },
    },
  });

  const mappedIngredients: IngredientsManagementIngredient[] = ingredients.map(
    (ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      icon: getIngredientIcon(ingredient.name),
      category: 'Uncategorized',
      calories: ingredient.caloriesPer100,
      protein: ingredient.proteinPer100,
      carbs: ingredient.carbsPer100,
      fat: ingredient.fatPer100,
      recipeCount: ingredient._count.recipeRelations,
    }),
  );

  return <IngredientsManagementClient ingredients={mappedIngredients} />;
}
