/**
 * Helper functions for preserving token or player name in URL during navigation
 */

/**
 * Get token from current URL
 */
export function getTokenFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('token');
}

/**
 * Get player name from current URL
 */
export function getPlayerFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('player');
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
 * Add player name to a URL path (spaces become +)
 */
export function addPlayerToUrl(path: string, playerName: string | null): string {
  if (!playerName) return path;
  const separator = path.includes('?') ? '&' : '?';
  // Encode and replace %20 with + for spaces
  const encodedName = encodeURIComponent(playerName).replace(/%20/g, '+');
  return `${path}${separator}mode=player&player=${encodedName}`;
}

/**
 * Create a navigate function that preserves token or player name
 */
export function createTokenPreservingNavigate(navigate: (path: string, options?: any) => void) {
  return (path: string, options?: { state?: any }) => {
    const playerName = getPlayerFromUrl();
    const token = getTokenFromUrl();
    
    // Prefer player name over token if both exist
    if (playerName) {
      const pathWithPlayer = addPlayerToUrl(path, playerName);
      navigate(pathWithPlayer, options);
    } else if (token) {
      const pathWithToken = addTokenToUrl(path, token);
      navigate(pathWithToken, options);
    } else {
      navigate(path, options);
    }
  };
}

