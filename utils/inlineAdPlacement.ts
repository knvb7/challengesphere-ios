export function shouldInsertInlineAd(
  zeroBasedOrganicIndex: number,
  totalOrganicItems: number,
  interval: number,
): boolean {
  if (
    !Number.isInteger(zeroBasedOrganicIndex)
    || !Number.isInteger(totalOrganicItems)
    || !Number.isInteger(interval)
    || zeroBasedOrganicIndex < 0
    || totalOrganicItems <= 0
    || interval <= 0
  ) {
    return false;
  }

  const organicCount = zeroBasedOrganicIndex + 1;
  const hasFollowingOrganicItem = zeroBasedOrganicIndex < totalOrganicItems - 1;
  return organicCount % interval === 0 && hasFollowingOrganicItem;
}
