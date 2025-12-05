/**
 * Helper functions for preserving token in URL during navigation
 */

/**
 * Get token from current URL
 */
export function getTokenFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('token');
}

/**
 * Add token to a URL path
 */
export function addTokenToUrl(path: string, token: string | null): string {
  if (!token) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Create a navigate function that preserves token
 */
export function createTokenPreservingNavigate(navigate: (path: string) => void) {
  return (path: string) => {
    const token = getTokenFromUrl();
    const pathWithToken = addTokenToUrl(path, token);
    navigate(pathWithToken);
  };
}

