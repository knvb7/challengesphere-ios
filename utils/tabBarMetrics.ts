export const TAB_BAR_BASE_HEIGHT = 58;

export const getTabBarMetrics = (bottomInset: number) => ({
  height: TAB_BAR_BASE_HEIGHT + bottomInset,
  paddingBottom: bottomInset,
});
