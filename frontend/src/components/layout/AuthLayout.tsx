import { Outlet } from 'react-router-dom';
import { Utensils, Camera, Sparkles, Calendar, ShoppingCart } from 'lucide-react';

/**
 * Frame for the signed-out screens.
 *
 * The feature blurbs describe what the app actually does. They previously
 * promised "easy drag-and-drop" meal planning, which was never built.
 */
const HIGHLIGHTS = [
  {
    icon: Camera,
    title: 'Snap & Cook',
    body: 'Photograph your ingredients and we will identify them for you.',
  },
  {
    icon: Sparkles,
    title: 'Leftover Magic',
    body: 'Turn whatever is left in the fridge into something worth eating.',
  },
  {
    icon: Calendar,
    title: 'Meal Planning',
    body: 'Generate a week of meals that respects your allergies and diet.',
  },
  {
    icon: ShoppingCart,
    title: 'Smart Lists',
    body: 'Build a grocery list straight from your planned meals.',
  },
];

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-neutral-50">
      {/* Marketing panel. Hidden on small screens so the form is the only
          thing between the user and signing in. */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 xl:p-16 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600">
              <Utensils className="h-6 w-6 text-white" aria-hidden />
            </div>
            <span className="font-display font-bold text-2xl text-primary-900">Pantry Chef</span>
          </div>

          <h2 className="font-display text-3xl xl:text-4xl font-bold text-neutral-900 mb-4 text-balance">
            Turn your ingredients into meals worth cooking.
          </h2>
          <p className="text-lg text-neutral-600 mb-10">
            Find recipes from what you already have. Less waste, less deciding, fewer trips to
            the shop.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-white">
                <Icon className="w-5 h-5 text-primary-600 mb-2" aria-hidden />
                <div className="font-semibold text-neutral-900 text-sm mb-1">{title}</div>
                <p className="text-sm text-neutral-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Compact branding, shown only where the marketing panel is not. */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600">
              <Utensils className="h-5 w-5 text-white" aria-hidden />
            </div>
            <span className="font-display font-bold text-xl text-primary-900">Pantry Chef</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
