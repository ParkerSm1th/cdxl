function trimTrailingSlash(input: string): string {
  return input.endsWith('/') ? input.slice(0, -1) : input;
}

export function getSharePath(shareId: string): string {
  return `/c/${shareId}`;
}

export function buildPublicShareUrl(siteUrl: string, shareId: string): string {
  return `${trimTrailingSlash(siteUrl)}${getSharePath(shareId)}`;
}
