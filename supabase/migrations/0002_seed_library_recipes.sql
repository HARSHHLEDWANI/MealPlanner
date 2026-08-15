/*
  Seed library recipes.

  These are the eight sample recipes from the original seed file, converted to
  the reconciled schema. Two changes from the original:

  1. `ingredients` is now text[] of free-text lines ("12 oz fettuccine pasta")
     rather than JSONB objects ({"name": "...", "amount": "12", "unit": "oz"}).
     AI-generated recipes always wrote plain strings, so the old column held
     two different shapes and any code reading it had to handle both.

  2. Each recipe carries servings, difficulty, cuisine_type and dietary_tags,
     replacing the old serving_size/tags pair.

  user_generated is FALSE and created_by is NULL, which marks these read-only:
  the API refuses to overwrite a library recipe and saves an enhanced copy
  owned by the requesting user instead.

  Idempotent — safe to re-run.
*/

INSERT INTO recipes (
  title, description, image_url, prep_time, cook_time, servings,
  difficulty, cuisine_type, dietary_tags, calories_per_serving,
  ingredients, instructions, user_generated
)
SELECT * FROM (VALUES
  (
    'Pasta Primavera',
    'A light and flavorful pasta dish loaded with fresh spring vegetables.',
    'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15, 20, 4, 'Easy', 'Italian',
    ARRAY['vegetarian', 'quick', 'pasta'], 520,
    ARRAY[
      '12 oz fettuccine pasta',
      '2 tbsp olive oil',
      '3 cloves garlic, minced',
      '1 cup cherry tomatoes, halved',
      '2 medium bell peppers, sliced',
      '1 medium zucchini, cut into half-moons',
      '1 medium yellow squash, cut into half-moons',
      '1 bunch asparagus, trimmed and halved',
      '1/2 cup parmesan cheese, grated',
      '1/4 cup fresh basil, chopped',
      '1 tsp salt',
      '1/2 tsp black pepper'
    ],
    ARRAY[
      'Bring a large pot of salted water to boil and cook pasta according to package directions.',
      'Meanwhile, prepare all vegetables: slice bell peppers, chop zucchini and squash into half-moons, trim and halve asparagus, halve cherry tomatoes, and mince garlic.',
      'In a large skillet, heat olive oil over medium-high heat. Add garlic and cook until fragrant, about 30 seconds.',
      'Add bell peppers and asparagus, cook for 3-4 minutes until starting to soften.',
      'Add zucchini, squash, and cherry tomatoes. Cook for another 3-4 minutes until all vegetables are tender-crisp.',
      'Drain pasta, reserving 1/2 cup of pasta water.',
      'Add pasta to the skillet with vegetables. Add some reserved pasta water to create a light sauce.',
      'Stir in grated parmesan cheese and fresh basil. Season with salt and pepper.',
      'Serve immediately with additional parmesan cheese if desired.'
    ],
    FALSE
  ),
  (
    'Honey Garlic Chicken Stir Fry',
    'A quick and easy stir fry with a sweet and savory sauce.',
    'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    10, 15, 4, 'Easy', 'Asian',
    ARRAY['quick', 'high-protein'], 480,
    ARRAY[
      '1.5 lbs boneless chicken breasts, cut into 1-inch pieces',
      '4 cups broccoli florets',
      '2 medium bell peppers, sliced',
      '2 medium carrots, sliced',
      '4 cloves garlic, minced',
      '1/4 cup honey',
      '1/4 cup soy sauce',
      '1/2 cup chicken broth',
      '1 tbsp cornstarch',
      '2 tbsp vegetable oil',
      '1 tbsp ginger, grated',
      '1/4 tsp red pepper flakes'
    ],
    ARRAY[
      'Cut chicken into 1-inch pieces. Season with salt and pepper.',
      'In a small bowl, whisk together honey, soy sauce, chicken broth, and cornstarch.',
      'Heat 1 tablespoon oil in a large skillet or wok over medium-high heat. Add chicken and cook until golden and cooked through, about 5-6 minutes. Remove from pan and set aside.',
      'Add remaining tablespoon of oil to the pan. Add broccoli, bell peppers, and carrots. Cook for 4-5 minutes until vegetables begin to soften.',
      'Add garlic and ginger to the pan and cook for 30 seconds until fragrant.',
      'Return chicken to the pan. Pour in the sauce mixture. Bring to a simmer and cook until sauce thickens, about 1-2 minutes.',
      'Sprinkle with red pepper flakes if desired.',
      'Serve over rice or noodles.'
    ],
    FALSE
  ),
  (
    'Avocado Toast with Poached Egg',
    'A nutritious breakfast that is both simple and satisfying.',
    'https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    10, 5, 2, 'Medium', 'American',
    ARRAY['breakfast', 'vegetarian', 'healthy', 'quick'], 340,
    ARRAY[
      '2 slices whole grain bread',
      '1 medium ripe avocado',
      '2 large eggs',
      '1 tsp lemon juice',
      '1/4 tsp red pepper flakes',
      '1/4 tsp salt',
      '1/4 tsp black pepper',
      '1 tbsp fresh cilantro, chopped',
      '1 tbsp white vinegar'
    ],
    ARRAY[
      'Fill a medium pot with water and bring to a gentle simmer. Add white vinegar.',
      'Toast the bread slices until golden brown.',
      'Cut the avocado in half, remove the pit, and scoop the flesh into a bowl. Add lemon juice, salt, and mash with a fork until desired consistency.',
      'Crack each egg into a small bowl. Create a gentle whirlpool in the simmering water and carefully slide each egg in. Cook for 3 minutes for a runny yolk.',
      'Spread mashed avocado onto each toast slice.',
      'Using a slotted spoon, remove poached eggs and place on top of avocado toast.',
      'Season with salt, pepper, red pepper flakes, and garnish with fresh cilantro.'
    ],
    FALSE
  ),
  (
    'Lemon Herb Roasted Chicken',
    'A classic roasted chicken with bright lemon and herb flavors.',
    'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15, 75, 6, 'Hard', 'American',
    ARRAY['dinner', 'comfort-food', 'high-protein'], 610,
    ARRAY[
      '4-5 lbs whole chicken',
      '2 medium lemons',
      '1 head garlic, halved crosswise',
      '4 sprigs fresh rosemary',
      '4 sprigs fresh thyme',
      '3 tbsp olive oil',
      '1 tbsp salt',
      '1 tsp black pepper',
      '4 tbsp butter, softened',
      '1 large onion, cut into chunks',
      '3 medium carrots, cut into chunks',
      '1 cup chicken broth'
    ],
    ARRAY[
      'Preheat oven to 425F (220C).',
      'Remove chicken giblets and pat chicken dry with paper towels.',
      'Cut one lemon into quarters and the other into thin slices. Cut the head of garlic in half crosswise.',
      'Season the cavity of the chicken with salt and pepper. Stuff with quartered lemon, half the garlic head, and 2 sprigs each of rosemary and thyme.',
      'In a small bowl, mix softened butter with 1 tablespoon olive oil, chopped herbs, lemon zest, salt, and pepper.',
      'Carefully loosen the skin over the chicken breast and spread herb butter mixture underneath.',
      'Rub the outside of chicken with remaining olive oil and season generously with salt and pepper.',
      'Cut onion and carrots into large chunks and place in the bottom of a roasting pan. Place chicken on top.',
      'Add chicken broth to the bottom of the pan.',
      'Roast in preheated oven for 1 hour and 15 minutes, or until juices run clear and internal temperature reaches 165F (74C).',
      'Let rest for 15 minutes before carving.'
    ],
    FALSE
  ),
  (
    'Vegetable Curry',
    'A hearty and flavorful vegetable curry that is perfect for a meatless meal.',
    'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    20, 30, 4, 'Medium', 'Indian',
    ARRAY['vegetarian', 'vegan', 'gluten-free', 'curry'], 430,
    ARRAY[
      '1 medium head cauliflower, cut into florets',
      '2 medium sweet potatoes, peeled and diced',
      '1 15 oz can chickpeas, drained and rinsed',
      '1 14 oz can coconut milk',
      '1 14 oz can diced tomatoes',
      '1 large onion, finely diced',
      '4 cloves garlic, minced',
      '1 2-inch piece ginger, grated',
      '2 tbsp curry powder',
      '1 cup vegetable broth',
      '2 tbsp olive oil',
      '2 cups spinach',
      '1/4 cup cilantro, chopped',
      '1 medium lime'
    ],
    ARRAY[
      'Peel and dice sweet potatoes into 1-inch cubes. Cut cauliflower into florets.',
      'Drain and rinse chickpeas.',
      'Finely dice onion, mince garlic, and grate ginger.',
      'Heat olive oil in a large pot over medium heat. Add onion and cook until softened, about 5 minutes.',
      'Add garlic and ginger, cook for 30 seconds until fragrant.',
      'Stir in curry powder and cook for another 30 seconds.',
      'Add cauliflower, sweet potatoes, chickpeas, diced tomatoes with their juice, coconut milk, and vegetable broth. Stir to combine.',
      'Bring to a simmer, then reduce heat to medium-low. Cover and cook for 20-25 minutes until vegetables are tender.',
      'Stir in spinach and cook until wilted, about 2 minutes.',
      'Squeeze in lime juice and adjust seasoning with salt and pepper.',
      'Garnish with fresh cilantro and serve over rice.'
    ],
    FALSE
  ),
  (
    'Berry Smoothie Bowl',
    'A nutritious and colorful breakfast bowl packed with antioxidants.',
    'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    10, 0, 1, 'Easy', 'American',
    ARRAY['breakfast', 'vegetarian', 'healthy', 'quick', 'no-cook'], 390,
    ARRAY[
      '1 cup frozen mixed berries',
      '1 medium banana',
      '1/2 cup Greek yogurt',
      '1/4 cup almond milk',
      '1 tbsp honey',
      '1/4 cup granola',
      '1 tbsp chia seeds',
      '1/4 cup fresh berries',
      '1 tbsp sliced almonds'
    ],
    ARRAY[
      'Place frozen berries, banana, Greek yogurt, almond milk, and honey in a blender.',
      'Blend until smooth and creamy. The mixture should be thicker than a regular smoothie.',
      'Pour into a bowl.',
      'Top with granola, chia seeds, fresh berries, and sliced almonds.',
      'Serve immediately.'
    ],
    FALSE
  ),
  (
    'Classic Beef Chili',
    'A hearty and spicy beef chili perfect for cold days.',
    'https://images.pexels.com/photos/5864352/pexels-photo-5864352.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15, 45, 6, 'Easy', 'American',
    ARRAY['dinner', 'comfort-food', 'spicy', 'high-protein'], 560,
    ARRAY[
      '2 lbs ground beef',
      '1 large onion, diced',
      '2 medium bell peppers, diced',
      '4 cloves garlic, minced',
      '2 15 oz cans kidney beans, drained and rinsed',
      '2 14 oz cans diced tomatoes',
      '2 tbsp tomato paste',
      '2 cups beef broth',
      '3 tbsp chili powder',
      '2 tsp ground cumin',
      '1 tsp paprika',
      '1 tsp oregano',
      '1 tsp salt',
      '1/2 tsp black pepper',
      '2 tbsp olive oil'
    ],
    ARRAY[
      'Heat olive oil in a large pot over medium-high heat. Add ground beef and cook until browned, breaking it up as it cooks.',
      'Add diced onions and bell peppers to the pot. Cook until vegetables have softened, about 5 minutes.',
      'Add minced garlic and cook for another 30 seconds until fragrant.',
      'Stir in tomato paste, chili powder, cumin, paprika, oregano, salt, and pepper. Cook for 1 minute to toast the spices.',
      'Add diced tomatoes with their juice, kidney beans, and beef broth. Stir to combine.',
      'Bring to a boil, then reduce heat to low. Simmer uncovered for at least 30 minutes, stirring occasionally. For deeper flavor, simmer for up to 2 hours.',
      'Taste and adjust seasoning as needed.',
      'Serve with your favorite toppings such as shredded cheese, sour cream, green onions, or jalapenos.'
    ],
    FALSE
  ),
  (
    'Mediterranean Quinoa Salad',
    'A fresh and healthy salad packed with protein and Mediterranean flavors.',
    'https://images.pexels.com/photos/764925/pexels-photo-764925.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15, 15, 4, 'Easy', 'Mediterranean',
    ARRAY['vegetarian', 'healthy', 'gluten-free', 'salad'], 410,
    ARRAY[
      '1 cup quinoa',
      '1 medium cucumber, diced',
      '1 cup cherry tomatoes, halved',
      '1/2 medium red onion, finely diced',
      '1/2 cup kalamata olives',
      '1/2 cup feta cheese, crumbled',
      '1/4 cup fresh parsley, chopped',
      '2 tbsp fresh mint, chopped',
      '1/4 cup olive oil',
      '2 tbsp lemon juice',
      '1 clove garlic, minced',
      '1/2 tsp salt',
      '1/4 tsp black pepper'
    ],
    ARRAY[
      'Rinse quinoa thoroughly under cold water. Combine with 2 cups water in a medium saucepan.',
      'Bring to a boil, then reduce heat to low, cover, and simmer for 15 minutes until water is absorbed and quinoa is tender.',
      'Remove from heat and let stand, covered, for 5 minutes. Fluff with a fork and let cool.',
      'Meanwhile, dice cucumber, halve cherry tomatoes, finely dice red onion, and chop herbs.',
      'In a small bowl, whisk together olive oil, lemon juice, minced garlic, salt, and pepper to make the dressing.',
      'In a large bowl, combine cooled quinoa, cucumber, tomatoes, red onion, olives, and herbs.',
      'Pour dressing over the salad and toss to combine.',
      'Gently fold in crumbled feta cheese.',
      'Refrigerate for at least 30 minutes before serving to allow flavors to meld.',
      'Serve chilled or at room temperature.'
    ],
    FALSE
  )
) AS seed(
  title, description, image_url, prep_time, cook_time, servings,
  difficulty, cuisine_type, dietary_tags, calories_per_serving,
  ingredients, instructions, user_generated
)
-- Re-runnable: skip any recipe already seeded under the same title.
WHERE NOT EXISTS (
  SELECT 1 FROM recipes r WHERE r.title = seed.title AND r.user_generated = FALSE
);
