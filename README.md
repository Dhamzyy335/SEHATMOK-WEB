# SehatMok Web

Next.js App Router + Prisma MySQL MVP with JWT cookie authentication.

## Environment

Create `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Required values:

```env
DATABASE_URL="mysql://root:password@localhost:3306/sehatmok"
JWT_SECRET="replace-with-a-long-random-secret"
GEMINI_API_KEY="replace-with-your-gemini-api-key"
GEMINI_MODEL="gemini-3-flash-preview"
```

`GEMINI_MODEL` is optional and defaults to `gemini-3-flash-preview`.

## Install

```powershell
npm install
```

## Migrate + Seed

```powershell
npx prisma migrate dev --name auth
npx prisma db seed
```

## Run

```powershell
npm run dev
```

## Main APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET/PUT /api/profile`
- `GET /api/dashboard/summary`
- `GET/POST /api/fridge`
- `PUT/DELETE /api/fridge/:id`
- `GET/POST /api/logs`
- `GET /api/recipes`
- `GET /api/recipes/:id`
- `POST /api/recommendations`
- `POST /api/ai/generate-recipe`

## Recommendation API

### Endpoint

`POST /api/recommendations` (auth required)

### Example payload

```json
{
  "selectedFridgeItemIds": ["cm9abc123", "cm9def456"],
  "dietaryPreferences": "high protein, low carb, no peanuts",
  "limit": 6
}
```

### Another payload example

```json
{
  "selectedFridgeItemIds": [],
  "dietaryPreferences": "",
  "limit": 10
}
```

### Example response shape

```json
{
  "targetCalories": 2100,
  "selectedFridgeItems": [
    { "id": "cm9abc123", "name": "Spinach", "category": "Vegetables" }
  ],
  "dietaryPreferences": "high protein, low carb, no peanuts",
  "recommendations": [
    {
      "id": "recipe-zesty-avocado-bowl",
      "name": "Zesty Avocado Bowl",
      "matchPercent": 66,
      "ingredientScore": 1,
      "calorieScore": 0.1619,
      "finalScore": 0.6648,
      "explanation": "Matches 3/3 required ingredients. 16% calorie closeness (340 vs 2100 kcal). Preference noted: high protein, low carb, no peanuts.",
      "calories": 340
    }
  ]
}
```

## Quick test flow (Phase 4)

1. Login through `/login`.
2. Ensure you have fridge items at `/fridge`.
3. Open `/ai-recipe`, select ingredients, add optional preferences, then click **Generate Recipe**.
4. Confirm you are redirected to `/recipes/[id]` and the new recipe is saved.
5. If Gemini fails, confirm recommendation cards appear as fallback with match percent and links.
6. Call `POST /api/recommendations` manually while logged in and verify sorted results by `finalScore`.
