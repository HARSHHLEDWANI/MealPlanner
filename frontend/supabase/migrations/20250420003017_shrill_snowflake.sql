/*
  # Seed sample recipes

  1. Purpose
    - Add sample recipes to demonstrate the application functionality
    - Each recipe includes complete information (ingredients, instructions, etc.)
*/

INSERT INTO recipes (id, title, description, image_url, prep_time, cook_time, serving_size, ingredients, instructions, tags)
VALUES 
  (
    gen_random_uuid(),
    'Pasta Primavera',
    'A light and flavorful pasta dish loaded with fresh spring vegetables.',
    'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15,
    20,
    4,
    '[
      {"id": "1", "name": "fettuccine pasta", "amount": "12", "unit": "oz"},
      {"id": "2", "name": "olive oil", "amount": "2", "unit": "tbsp"},
      {"id": "3", "name": "garlic", "amount": "3", "unit": "cloves"},
      {"id": "4", "name": "cherry tomatoes", "amount": "1", "unit": "cup"},
      {"id": "5", "name": "bell peppers", "amount": "2", "unit": "medium"},
      {"id": "6", "name": "zucchini", "amount": "1", "unit": "medium"},
      {"id": "7", "name": "yellow squash", "amount": "1", "unit": "medium"},
      {"id": "8", "name": "asparagus", "amount": "1", "unit": "bunch"},
      {"id": "9", "name": "parmesan cheese", "amount": "1/2", "unit": "cup"},
      {"id": "10", "name": "fresh basil", "amount": "1/4", "unit": "cup"},
      {"id": "11", "name": "salt", "amount": "1", "unit": "tsp"},
      {"id": "12", "name": "black pepper", "amount": "1/2", "unit": "tsp"}
    ]',
    '[
      "Bring a large pot of salted water to boil and cook pasta according to package directions.",
      "Meanwhile, prepare all vegetables: slice bell peppers, chop zucchini and squash into half-moons, trim and halve asparagus, halve cherry tomatoes, and mince garlic.",
      "In a large skillet, heat olive oil over medium-high heat. Add garlic and cook until fragrant, about 30 seconds.",
      "Add bell peppers and asparagus, cook for 3-4 minutes until starting to soften.",
      "Add zucchini, squash, and cherry tomatoes. Cook for another 3-4 minutes until all vegetables are tender-crisp.",
      "Drain pasta, reserving 1/2 cup of pasta water.",
      "Add pasta to the skillet with vegetables. Add some reserved pasta water to create a light sauce.",
      "Stir in grated parmesan cheese and fresh basil. Season with salt and pepper.",
      "Serve immediately with additional parmesan cheese if desired."
    ]',
    '{"pasta", "vegetarian", "quick", "italian"}'
  ),
  (
    gen_random_uuid(),
    'Honey Garlic Chicken Stir Fry',
    'A quick and easy stir fry with a sweet and savory sauce.',
    'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    10,
    15,
    4,
    '[
      {"id": "1", "name": "boneless chicken breasts", "amount": "1.5", "unit": "lbs"},
      {"id": "2", "name": "broccoli florets", "amount": "4", "unit": "cups"},
      {"id": "3", "name": "bell peppers", "amount": "2", "unit": "medium"},
      {"id": "4", "name": "carrots", "amount": "2", "unit": "medium"},
      {"id": "5", "name": "garlic", "amount": "4", "unit": "cloves"},
      {"id": "6", "name": "honey", "amount": "1/4", "unit": "cup"},
      {"id": "7", "name": "soy sauce", "amount": "1/4", "unit": "cup"},
      {"id": "8", "name": "chicken broth", "amount": "1/2", "unit": "cup"},
      {"id": "9", "name": "cornstarch", "amount": "1", "unit": "tbsp"},
      {"id": "10", "name": "vegetable oil", "amount": "2", "unit": "tbsp"},
      {"id": "11", "name": "ginger", "amount": "1", "unit": "tbsp"},
      {"id": "12", "name": "red pepper flakes", "amount": "1/4", "unit": "tsp"}
    ]',
    '[
      "Cut chicken into 1-inch pieces. Season with salt and pepper.",
      "In a small bowl, whisk together honey, soy sauce, chicken broth, and cornstarch.",
      "Heat 1 tablespoon oil in a large skillet or wok over medium-high heat. Add chicken and cook until golden and cooked through, about 5-6 minutes. Remove from pan and set aside.",
      "Add remaining tablespoon of oil to the pan. Add broccoli, bell peppers, and carrots. Cook for 4-5 minutes until vegetables begin to soften.",
      "Add garlic and ginger to the pan and cook for 30 seconds until fragrant.",
      "Return chicken to the pan. Pour in the sauce mixture. Bring to a simmer and cook until sauce thickens, about 1-2 minutes.",
      "Sprinkle with red pepper flakes if desired.",
      "Serve over rice or noodles."
    ]',
    '{"chicken", "stir-fry", "asian", "quick"}'
  ),
  (
    gen_random_uuid(),
    'Avocado Toast with Poached Egg',
    'A nutritious breakfast that\'s both simple and satisfying.',
    'https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    10,
    5,
    2,
    '[
      {"id": "1", "name": "whole grain bread", "amount": "2", "unit": "slices"},
      {"id": "2", "name": "ripe avocado", "amount": "1", "unit": "medium"},
      {"id": "3", "name": "eggs", "amount": "2", "unit": "large"},
      {"id": "4", "name": "lemon juice", "amount": "1", "unit": "tsp"},
      {"id": "5", "name": "red pepper flakes", "amount": "1/4", "unit": "tsp"},
      {"id": "6", "name": "salt", "amount": "1/4", "unit": "tsp"},
      {"id": "7", "name": "black pepper", "amount": "1/4", "unit": "tsp"},
      {"id": "8", "name": "fresh cilantro", "amount": "1", "unit": "tbsp"},
      {"id": "9", "name": "white vinegar", "amount": "1", "unit": "tbsp"}
    ]',
    '[
      "Fill a medium pot with water and bring to a gentle simmer. Add white vinegar.",
      "Toast the bread slices until golden brown.",
      "Cut the avocado in half, remove the pit, and scoop the flesh into a bowl. Add lemon juice, salt, and mash with a fork until desired consistency.",
      "Crack each egg into a small bowl. Create a gentle whirlpool in the simmering water and carefully slide each egg in. Cook for 3 minutes for a runny yolk.",
      "Spread mashed avocado onto each toast slice.",
      "Using a slotted spoon, remove poached eggs and place on top of avocado toast.",
      "Season with salt, pepper, red pepper flakes, and garnish with fresh cilantro."
    ]',
    '{"breakfast", "vegetarian", "healthy", "quick"}'
  ),
  (
    gen_random_uuid(),
    'Lemon Herb Roasted Chicken',
    'A classic roasted chicken with bright lemon and herb flavors.',
    'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15,
    75,
    6,
    '[
      {"id": "1", "name": "whole chicken", "amount": "4-5", "unit": "lbs"},
      {"id": "2", "name": "lemons", "amount": "2", "unit": "medium"},
      {"id": "3", "name": "garlic", "amount": "1", "unit": "head"},
      {"id": "4", "name": "fresh rosemary", "amount": "4", "unit": "sprigs"},
      {"id": "5", "name": "fresh thyme", "amount": "4", "unit": "sprigs"},
      {"id": "6", "name": "olive oil", "amount": "3", "unit": "tbsp"},
      {"id": "7", "name": "salt", "amount": "1", "unit": "tbsp"},
      {"id": "8", "name": "black pepper", "amount": "1", "unit": "tsp"},
      {"id": "9", "name": "butter", "amount": "4", "unit": "tbsp"},
      {"id": "10", "name": "onion", "amount": "1", "unit": "large"},
      {"id": "11", "name": "carrots", "amount": "3", "unit": "medium"},
      {"id": "12", "name": "chicken broth", "amount": "1", "unit": "cup"}
    ]',
    '[
      "Preheat oven to 425°F (220°C).",
      "Remove chicken giblets and pat chicken dry with paper towels.",
      "Cut one lemon into quarters and the other into thin slices. Cut the head of garlic in half crosswise.",
      "Season the cavity of the chicken with salt and pepper. Stuff with quartered lemon, half the garlic head, and 2 sprigs each of rosemary and thyme.",
      "In a small bowl, mix softened butter with 1 tablespoon olive oil, chopped herbs, lemon zest, salt, and pepper.",
      "Carefully loosen the skin over the chicken breast and spread herb butter mixture underneath.",
      "Rub the outside of chicken with remaining olive oil and season generously with salt and pepper.",
      "Cut onion and carrots into large chunks and place in the bottom of a roasting pan. Place chicken on top.",
      "Add chicken broth to the bottom of the pan.",
      "Roast in preheated oven for 1 hour and 15 minutes, or until juices run clear and internal temperature reaches 165°F (74°C).",
      "Let rest for 15 minutes before carving."
    ]',
    '{"chicken", "dinner", "comfort food", "roast"}'
  ),
  (
    gen_random_uuid(),
    'Vegetable Curry',
    'A hearty and flavorful vegetable curry that\'s perfect for a meatless meal.',
    'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    20,
    30,
    4,
    '[
      {"id": "1", "name": "cauliflower", "amount": "1", "unit": "medium head"},
      {"id": "2", "name": "sweet potato", "amount": "2", "unit": "medium"},
      {"id": "3", "name": "chickpeas", "amount": "1", "unit": "15 oz can"},
      {"id": "4", "name": "coconut milk", "amount": "1", "unit": "14 oz can"},
      {"id": "5", "name": "diced tomatoes", "amount": "1", "unit": "14 oz can"},
      {"id": "6", "name": "onion", "amount": "1", "unit": "large"},
      {"id": "7", "name": "garlic", "amount": "4", "unit": "cloves"},
      {"id": "8", "name": "ginger", "amount": "1", "unit": "2-inch piece"},
      {"id": "9", "name": "curry powder", "amount": "2", "unit": "tbsp"},
      {"id": "10", "name": "vegetable broth", "amount": "1", "unit": "cup"},
      {"id": "11", "name": "olive oil", "amount": "2", "unit": "tbsp"},
      {"id": "12", "name": "spinach", "amount": "2", "unit": "cups"},
      {"id": "13", "name": "cilantro", "amount": "1/4", "unit": "cup"},
      {"id": "14", "name": "lime", "amount": "1", "unit": "medium"}
    ]',
    '[
      "Peel and dice sweet potatoes into 1-inch cubes. Cut cauliflower into florets.",
      "Drain and rinse chickpeas.",
      "Finely dice onion, mince garlic, and grate ginger.",
      "Heat olive oil in a large pot over medium heat. Add onion and cook until softened, about 5 minutes.",
      "Add garlic and ginger, cook for 30 seconds until fragrant.",
      "Stir in curry powder and cook for another 30 seconds.",
      "Add cauliflower, sweet potatoes, chickpeas, diced tomatoes with their juice, coconut milk, and vegetable broth. Stir to combine.",
      "Bring to a simmer, then reduce heat to medium-low. Cover and cook for 20-25 minutes until vegetables are tender.",
      "Stir in spinach and cook until wilted, about 2 minutes.",
      "Squeeze in lime juice and adjust seasoning with salt and pepper.",
      "Garnish with fresh cilantro and serve over rice."
    ]',
    '{"vegetarian", "vegan", "curry", "indian", "gluten-free"}'
  ),
  (
    gen_random_uuid(),
    'Berry Smoothie Bowl',
    'A nutritious and colorful breakfast bowl packed with antioxidants.',
    'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    10,
    0,
    1,
    '[
      {"id": "1", "name": "frozen mixed berries", "amount": "1", "unit": "cup"},
      {"id": "2", "name": "banana", "amount": "1", "unit": "medium"},
      {"id": "3", "name": "Greek yogurt", "amount": "1/2", "unit": "cup"},
      {"id": "4", "name": "almond milk", "amount": "1/4", "unit": "cup"},
      {"id": "5", "name": "honey", "amount": "1", "unit": "tbsp"},
      {"id": "6", "name": "granola", "amount": "1/4", "unit": "cup"},
      {"id": "7", "name": "chia seeds", "amount": "1", "unit": "tbsp"},
      {"id": "8", "name": "fresh berries", "amount": "1/4", "unit": "cup"},
      {"id": "9", "name": "sliced almonds", "amount": "1", "unit": "tbsp"}
    ]',
    '[
      "Place frozen berries, banana, Greek yogurt, almond milk, and honey in a blender.",
      "Blend until smooth and creamy. The mixture should be thicker than a regular smoothie.",
      "Pour into a bowl.",
      "Top with granola, chia seeds, fresh berries, and sliced almonds.",
      "Serve immediately."
    ]',
    '{"breakfast", "vegetarian", "healthy", "smoothie", "quick"}'
  ),
  (
    gen_random_uuid(),
    'Classic Beef Chili',
    'A hearty and spicy beef chili perfect for cold days.',
    'https://images.pexels.com/photos/5864352/pexels-photo-5864352.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15,
    45,
    6,
    '[
      {"id": "1", "name": "ground beef", "amount": "2", "unit": "lbs"},
      {"id": "2", "name": "onion", "amount": "1", "unit": "large"},
      {"id": "3", "name": "bell peppers", "amount": "2", "unit": "medium"},
      {"id": "4", "name": "garlic", "amount": "4", "unit": "cloves"},
      {"id": "5", "name": "kidney beans", "amount": "2", "unit": "15 oz cans"},
      {"id": "6", "name": "diced tomatoes", "amount": "2", "unit": "14 oz cans"},
      {"id": "7", "name": "tomato paste", "amount": "2", "unit": "tbsp"},
      {"id": "8", "name": "beef broth", "amount": "2", "unit": "cups"},
      {"id": "9", "name": "chili powder", "amount": "3", "unit": "tbsp"},
      {"id": "10", "name": "ground cumin", "amount": "2", "unit": "tsp"},
      {"id": "11", "name": "paprika", "amount": "1", "unit": "tsp"},
      {"id": "12", "name": "oregano", "amount": "1", "unit": "tsp"},
      {"id": "13", "name": "salt", "amount": "1", "unit": "tsp"},
      {"id": "14", "name": "black pepper", "amount": "1/2", "unit": "tsp"},
      {"id": "15", "name": "olive oil", "amount": "2", "unit": "tbsp"}
    ]',
    '[
      "Heat olive oil in a large pot over medium-high heat. Add ground beef and cook until browned, breaking it up as it cooks.",
      "Add diced onions and bell peppers to the pot. Cook until vegetables have softened, about 5 minutes.",
      "Add minced garlic and cook for another 30 seconds until fragrant.",
      "Stir in tomato paste, chili powder, cumin, paprika, oregano, salt, and pepper. Cook for 1 minute to toast the spices.",
      "Add diced tomatoes with their juice, kidney beans (drained and rinsed), and beef broth. Stir to combine.",
      "Bring to a boil, then reduce heat to low. Simmer uncovered for at least 30 minutes, stirring occasionally. For deeper flavor, simmer for up to 2 hours.",
      "Taste and adjust seasoning as needed.",
      "Serve with your favorite toppings such as shredded cheese, sour cream, green onions, or jalapenos."
    ]',
    '{"beef", "dinner", "comfort food", "spicy"}'
  ),
  (
    gen_random_uuid(),
    'Mediterranean Quinoa Salad',
    'A fresh and healthy salad packed with protein and Mediterranean flavors.',
    'https://images.pexels.com/photos/764925/pexels-photo-764925.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    15,
    15,
    4,
    '[
      {"id": "1", "name": "quinoa", "amount": "1", "unit": "cup"},
      {"id": "2", "name": "cucumber", "amount": "1", "unit": "medium"},
      {"id": "3", "name": "cherry tomatoes", "amount": "1", "unit": "cup"},
      {"id": "4", "name": "red onion", "amount": "1/2", "unit": "medium"},
      {"id": "5", "name": "kalamata olives", "amount": "1/2", "unit": "cup"},
      {"id": "6", "name": "feta cheese", "amount": "1/2", "unit": "cup"},
      {"id": "7", "name": "fresh parsley", "amount": "1/4", "unit": "cup"},
      {"id": "8", "name": "fresh mint", "amount": "2", "unit": "tbsp"},
      {"id": "9", "name": "olive oil", "amount": "1/4", "unit": "cup"},
      {"id": "10", "name": "lemon juice", "amount": "2", "unit": "tbsp"},
      {"id": "11", "name": "garlic", "amount": "1", "unit": "clove"},
      {"id": "12", "name": "salt", "amount": "1/2", "unit": "tsp"},
      {"id": "13", "name": "black pepper", "amount": "1/4", "unit": "tsp"}
    ]',
    '[
      "Rinse quinoa thoroughly under cold water. Combine with 2 cups water in a medium saucepan.",
      "Bring to a boil, then reduce heat to low, cover, and simmer for 15 minutes until water is absorbed and quinoa is tender.",
      "Remove from heat and let stand, covered, for 5 minutes. Fluff with a fork and let cool.",
      "Meanwhile, dice cucumber, halve cherry tomatoes, finely dice red onion, and chop herbs.",
      "In a small bowl, whisk together olive oil, lemon juice, minced garlic, salt, and pepper to make the dressing.",
      "In a large bowl, combine cooled quinoa, cucumber, tomatoes, red onion, olives, and herbs.",
      "Pour dressing over the salad and toss to combine.",
      "Gently fold in crumbled feta cheese.",
      "Refrigerate for at least 30 minutes before serving to allow flavors to meld.",
      "Serve chilled or at room temperature."
    ]',
    '{"vegetarian", "salad", "healthy", "mediterranean", "gluten-free"}'
  );