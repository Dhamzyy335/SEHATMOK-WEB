const bcrypt = require("bcryptjs");
const { PrismaClient, ActivityLevel, LogType } = require("@prisma/client");

const prisma = new PrismaClient();
const seededUserId = "demo-user";

async function seedUser() {
  const passwordHash = await bcrypt.hash("demo12345", 12);

  await prisma.user.upsert({
    where: { id: seededUserId },
    update: {
      passwordHash,
    },
    create: {
      id: seededUserId,
      email: "demo@sehatmok.app",
      passwordHash,
      age: 27,
      weight: 72,
      height: 176,
      activityLevel: ActivityLevel.MODERATE,
      targetCalories: 2100,
    },
  });
}

async function seedIngredients() {
  const ingredients = [
    {
      id: "ing-egg",
      name: "Egg",
      caloriesPer100: 155,
      proteinPer100: 13,
      carbsPer100: 1.1,
      fatPer100: 11,
    },
    {
      id: "ing-spinach",
      name: "Spinach",
      caloriesPer100: 23,
      proteinPer100: 2.9,
      carbsPer100: 3.6,
      fatPer100: 0.4,
    },
    {
      id: "ing-salmon",
      name: "Salmon",
      caloriesPer100: 208,
      proteinPer100: 20,
      carbsPer100: 0,
      fatPer100: 13,
    },
    {
      id: "ing-avocado",
      name: "Avocado",
      caloriesPer100: 160,
      proteinPer100: 2,
      carbsPer100: 9,
      fatPer100: 15,
    },
    {
      id: "ing-carrot",
      name: "Carrot",
      caloriesPer100: 41,
      proteinPer100: 0.9,
      carbsPer100: 10,
      fatPer100: 0.2,
    },
    {
      id: "ing-yogurt",
      name: "Greek Yogurt",
      caloriesPer100: 59,
      proteinPer100: 10,
      carbsPer100: 3.6,
      fatPer100: 0.4,
    },
  ];

  for (const ingredient of ingredients) {
    const { id, ...ingredientData } = ingredient;
    await prisma.ingredient.upsert({
      where: { id },
      update: ingredientData,
      create: ingredient,
    });
  }
}

async function seedRecipes() {
  const recipes = [
    {
      id: "recipe-zesty-avocado-bowl",
      name: "Zesty Avocado Bowl",
      description:
        "Fresh avocado with eggs and spinach for a light, high-protein meal.",
      steps: [
        "Boil eggs to preferred doneness.",
        "Slice avocado and toss with lemon juice.",
        "Saute spinach with a little olive oil.",
        "Assemble and season with salt and pepper.",
      ],
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAtnULxlS3Y-iC25sgtcZc129JRE3PYMoGkEmmMW1cd5Y7sE_5duJysPMIQEuvarHj_VsqEht8odI6v5kwrBr2y_Llrsm0dXsYU09h2OVg3Akj4AC-3AMovzOzmu6y7s7sGN5bgFBFDlpOPBEzl_zlJfQqqwHlDGR3AjspxrPHo9MzXuEhAGX-ulzuEItYh7Cr-Cc2P212uSA-eDRns2qZZ12Xdw51MqhGJgf5TyxU3fttNZyXdzt_4M0BMvNlaxPiMB6SsCb2E3bAe",
      calories: 340,
      protein: 24,
      carbs: 12,
      fat: 18,
      fiber: 8,
    },
    {
      id: "recipe-salmon-skillet",
      name: "Herbed Salmon Skillet",
      description: "Pan-seared salmon with spinach and avocado.",
      steps: [
        "Season salmon with pepper and herbs.",
        "Sear salmon on a hot skillet for 3-4 minutes each side.",
        "Add spinach and cook briefly until wilted.",
        "Serve with sliced avocado.",
      ],
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCbFuVCFRSc8NBNwJn92WEd0r5td8jRGBpo8RfK3X4W5DTysoizrkYNsGEAp9wBkeNEEHtn8bpeuCkzb9chD4TYAWvfM2gf1FrlfCIpoPZITFzCxdoQsJtPGxjt2HvoQp8y8P7EOaHBYaU15lBLg45kONuJVXwwn0Ax_evmHG6pSOGEWdl2ELeOl_Y8_cINqTKgDqfdG7EvG6s79OUnaueJP_3W0370N9QcG7cd3bgL33DIL6ID0RTTzqO4awOvzQkhZz1odzAWG7_D",
      calories: 420,
      protein: 35,
      carbs: 8,
      fat: 26,
      fiber: 5,
    },
    {
      id: "recipe-carrot-yogurt-smoothie",
      name: "Carrot Yogurt Smoothie Bowl",
      description: "Creamy yogurt bowl blended with carrot and avocado.",
      steps: [
        "Steam carrots until soft then cool.",
        "Blend carrots, yogurt, and avocado until smooth.",
        "Top with nuts or seeds if desired.",
      ],
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAocdUXY1Fzs7MYCrcd_RX2414EZgOBza-ax1C7rd3uAyfhNZ45rSAguWNx1J4CO-sjE54H9KfxyMWnutrI8OCpxuqGo82tiCFytp3ZxNtLy9m3RBci61XlIqY0K2_RXXcEN2tdzKWn3UN96MJqvPmE7YBQX7pMbV_iukSfvmgsc-nA6OJz1Y7LJmpf6teINgfIsCuP0iTuXBGi4QAjPfiqmGgkP50AswM9PIgxOI2XaokNvqGpC51cITfNQFItLgF14ySZXLTs-_Ue",
      calories: 280,
      protein: 16,
      carbs: 24,
      fat: 12,
      fiber: 7,
    },
  ];

  for (const recipe of recipes) {
    const { id, ...recipeData } = recipe;
    await prisma.recipe.upsert({
      where: { id },
      update: recipeData,
      create: recipe,
    });
  }

  const recipeIngredients = [
    {
      id: "ri-avocado-bowl-egg",
      recipeId: "recipe-zesty-avocado-bowl",
      ingredientId: "ing-egg",
      quantity: 2,
      unit: "pcs",
    },
    {
      id: "ri-avocado-bowl-spinach",
      recipeId: "recipe-zesty-avocado-bowl",
      ingredientId: "ing-spinach",
      quantity: 80,
      unit: "g",
    },
    {
      id: "ri-avocado-bowl-avocado",
      recipeId: "recipe-zesty-avocado-bowl",
      ingredientId: "ing-avocado",
      quantity: 1,
      unit: "pcs",
    },
    {
      id: "ri-salmon-skillet-salmon",
      recipeId: "recipe-salmon-skillet",
      ingredientId: "ing-salmon",
      quantity: 200,
      unit: "g",
    },
    {
      id: "ri-salmon-skillet-spinach",
      recipeId: "recipe-salmon-skillet",
      ingredientId: "ing-spinach",
      quantity: 60,
      unit: "g",
    },
    {
      id: "ri-salmon-skillet-avocado",
      recipeId: "recipe-salmon-skillet",
      ingredientId: "ing-avocado",
      quantity: 1,
      unit: "pcs",
    },
    {
      id: "ri-smoothie-carrot",
      recipeId: "recipe-carrot-yogurt-smoothie",
      ingredientId: "ing-carrot",
      quantity: 120,
      unit: "g",
    },
    {
      id: "ri-smoothie-yogurt",
      recipeId: "recipe-carrot-yogurt-smoothie",
      ingredientId: "ing-yogurt",
      quantity: 180,
      unit: "g",
    },
    {
      id: "ri-smoothie-avocado",
      recipeId: "recipe-carrot-yogurt-smoothie",
      ingredientId: "ing-avocado",
      quantity: 0.5,
      unit: "pcs",
    },
  ];

  for (const relation of recipeIngredients) {
    const { id, ...relationData } = relation;
    await prisma.recipeIngredient.upsert({
      where: { id },
      update: relationData,
      create: relation,
    });
  }
}

async function seedFridgeItems() {
  await prisma.fridgeItem.deleteMany({
    where: { userId: seededUserId },
  });

  await prisma.fridgeItem.createMany({
    data: [
      {
        userId: seededUserId,
        name: "Carrots",
        category: "Vegetables",
        quantity: 3,
        unit: "pcs",
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: seededUserId,
        name: "Greek Yogurt",
        category: "Dairy",
        quantity: 1.2,
        unit: "kg",
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        userId: seededUserId,
        name: "Atlantic Salmon",
        category: "Proteins",
        quantity: 450,
        unit: "g",
        expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
      {
        userId: seededUserId,
        name: "Honeycrisp Apples",
        category: "Fruits",
        quantity: 6,
        unit: "pcs",
        expiryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedLogs() {
  await prisma.userLog.deleteMany({
    where: { userId: seededUserId },
  });

  await prisma.userLog.createMany({
    data: [
      {
        userId: seededUserId,
        type: LogType.INTAKE,
        calories: 820,
        protein: 48,
        carbs: 74,
        fat: 28,
      },
      {
        userId: seededUserId,
        type: LogType.OUTTAKE,
        calories: 280,
      },
    ],
  });
}

async function main() {
  await seedUser();
  await seedIngredients();
  await seedRecipes();
  await seedFridgeItems();
  await seedLogs();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database seed completed.");
  })
  .catch(async (error) => {
    console.error("Database seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
