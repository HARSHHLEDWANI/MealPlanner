/**
 * Joins class names, dropping falsy entries.
 *
 * Lives apart from the component library so that file exports only components,
 * which is what React Fast Refresh needs to hot-reload them reliably.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
