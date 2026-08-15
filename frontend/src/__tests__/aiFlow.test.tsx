import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/**
 * The AI generation flow, from the user's side.
 *
 * Two properties matter here and neither is visible from a store test: that
 * generating is a separate, deliberate action from searching (search used to
 * silently spend a billable model call), and that running out of quota
 * produces an explanation rather than a dead button or a red error.
 */

const get = vi.fn();
const post = vi.fn();

class MockApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
  get isLimited() {
    return this.status === 429;
  }
}

vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: MockApiError,
  errorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
}));

const RecipeFinder = (await import('@/pages/RecipeFinder')).default;
const { useRecipeStore } = await import('@/store/recipeStore');
const { useUsageStore } = await import('@/store/usageStore');

const RECIPE = {
  id: 'r1',
  title: 'Test Curry',
  description: 'Warming and quick.',
  ingredients: ['1 tbsp oil'],
  instructions: ['Cook it.'],
  prep_time: 10,
  cook_time: 20,
  servings: 2,
  difficulty: 'Easy' as const,
  cuisine_type: 'Indian',
  dietary_tags: ['vegan'],
  user_generated: true,
  created_at: '2026-08-15T00:00:00Z',
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <RecipeFinder />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  useRecipeStore.setState({
    recipes: [],
    savedRecipes: [],
    searchResults: [],
    loading: false,
    generating: false,
    error: null,
    hasSearched: false,
  });
  useUsageStore.setState({ usage: null, exhausted: false });
  get.mockResolvedValue({ data: { used: 2, quota: 10, remaining: 8 } });
});

describe('AI generation flow', () => {
  it('prompts the user to search before anything has run', async () => {
    renderPage();

    expect(await screen.findByText(/search to get started/i)).toBeInTheDocument();
  });

  it('shows how much AI allowance is left', async () => {
    renderPage();

    expect(await screen.findByText(/8 of 10 AI generations left today/i)).toBeInTheDocument();
  });

  it('searching the library does not spend an AI call', async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ data: [RECIPE] });
    renderPage();

    await user.type(screen.getByLabelText(/what would you like to cook/i), 'curry');
    await user.click(screen.getByRole('button', { name: /search recipes/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/api/recipes/search', { query: 'curry' });
    expect(post).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/'),
      expect.anything()
    );
  });

  it('generates only when the user explicitly asks for it', async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ data: RECIPE });
    renderPage();

    await user.type(screen.getByLabelText(/what would you like to cook/i), 'a warming curry');
    await user.click(screen.getByRole('button', { name: /generate with ai/i }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/ai/recipe/generate', {
        query: 'a warming curry',
        cuisine: undefined,
      })
    );
    expect(await screen.findByText('Test Curry')).toBeInTheDocument();
  });

  it('passes the chosen cuisine when generating', async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ data: RECIPE });
    renderPage();

    await user.type(screen.getByLabelText(/what would you like to cook/i), 'curry');
    await user.selectOptions(screen.getByLabelText(/cuisine/i), 'Indian');
    await user.click(screen.getByRole('button', { name: /generate with ai/i }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/ai/recipe/generate', {
        query: 'curry',
        cuisine: 'Indian',
      })
    );
  });

  it('both actions are disabled until there is something to act on', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /search recipes/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /generate with ai/i })).toBeDisabled();
  });

  it('explains a spent quota and leaves search working', async () => {
    const user = userEvent.setup();
    post.mockRejectedValue(
      new MockApiError(429, 'QUOTA_EXCEEDED', 'used them all', { used: 10, quota: 10 })
    );
    renderPage();

    await user.type(screen.getByLabelText(/what would you like to cook/i), 'curry');
    await user.click(screen.getByRole('button', { name: /generate with ai/i }));

    // A named limit, not a generic failure.
    expect(await screen.findByText(/used today's AI generations/i)).toBeInTheDocument();
    expect(screen.getByText(/resets tomorrow/i)).toBeInTheDocument();
    // Generating is blocked; searching the library still is not.
    expect(screen.getByRole('button', { name: /generate with ai/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /search recipes/i })).toBeEnabled();
  });

  it('shows a genuine failure as an error the user can dismiss', async () => {
    const user = userEvent.setup();
    post.mockRejectedValue(new MockApiError(502, 'UPSTREAM_FAILURE', 'The model is unavailable.'));
    renderPage();

    await user.type(screen.getByLabelText(/what would you like to cook/i), 'curry');
    await user.click(screen.getByRole('button', { name: /generate with ai/i }));

    expect(await screen.findByText('The model is unavailable.')).toBeInTheDocument();
    // Not the quota panel — this one is worth retrying.
    expect(screen.queryByText(/resets tomorrow/i)).not.toBeInTheDocument();
  });

  it('distinguishes "no results" from "not searched yet"', async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ data: [] });
    renderPage();

    await user.type(screen.getByLabelText(/what would you like to cook/i), 'zzzz');
    await user.click(screen.getByRole('button', { name: /search recipes/i }));

    expect(await screen.findByText(/no recipes matched that search/i)).toBeInTheDocument();
  });
});
