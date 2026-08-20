
/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // Always return 'dark' to make dark theme the default everywhere
  return 'dark' as const;
}
