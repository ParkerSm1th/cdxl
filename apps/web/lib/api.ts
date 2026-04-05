import type { Metadata } from 'next';
import type { ShareResponse } from '@codexlink/shared';

export type ShareFetchResult =
  | { state: 'active'; share: ShareResponse }
  | { state: 'not-found' }
  | { state: 'revoked' };

function getApiBaseUrl(): string {
  return process.env['API_BASE_URL'] ?? 'http://localhost:8787';
}

export async function fetchShare(shareId: string): Promise<ShareFetchResult> {
  const response = await fetch(`${getApiBaseUrl()}/v1/shares/${shareId}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return { state: 'not-found' };
  }

  if (response.status === 410) {
    return { state: 'revoked' };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch share ${shareId}`);
  }

  return {
    share: (await response.json()) as ShareResponse,
    state: 'active',
  };
}

export function buildShareMetadata(
  shareId: string,
  result: ShareFetchResult,
): Metadata {
  const siteUrl = process.env['SITE_URL'] ?? 'https://codexl.ink';

  if (result.state === 'not-found') {
    return {
      description: 'This CodexLink share does not exist.',
      title: 'Share Not Found',
    };
  }

  if (result.state === 'revoked') {
    return {
      description: 'This CodexLink share has been revoked.',
      title: 'Share Revoked',
    };
  }

  return {
    description: result.share.data.excerpt,
    openGraph: {
      description: result.share.data.excerpt,
      images: [`${siteUrl}/api/og?shareId=${shareId}`],
      title: result.share.data.title,
      type: 'article',
    },
    title: result.share.data.title,
    twitter: {
      card: 'summary_large_image',
      description: result.share.data.excerpt,
      images: [`${siteUrl}/api/og?shareId=${shareId}`],
      title: result.share.data.title,
    },
  };
}

