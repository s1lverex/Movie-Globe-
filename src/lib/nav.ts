/**
 * Lets non-router code (the 3D scene, timers) trigger route changes.
 * App registers React Router's navigate function on mount.
 */
type NavigateFn = (to: string) => void;
let navigateFn: NavigateFn = (to) => window.history.pushState({}, '', to);

export function registerNavigate(fn: NavigateFn): void {
  navigateFn = fn;
}

export function navigate(to: string): void {
  navigateFn(to);
}

export function openLocation(slug: string): void {
  navigateFn(`/location/${slug}`);
}
