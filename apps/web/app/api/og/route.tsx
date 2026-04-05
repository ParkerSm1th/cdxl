import { ImageResponse } from 'next/og';
import { fetchShare } from '../../../lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('shareId');

  const result = shareId ? await fetchShare(shareId) : { state: 'not-found' as const };
  const title =
    result.state === 'active' ? result.share.data.title : 'CodexLink share';
  const subtitle =
    result.state === 'active'
      ? result.share.data.excerpt
      : result.state === 'revoked'
        ? 'This public chat link has been revoked.'
        : 'Share Codex chats with one public link.';

  return new ImageResponse(
    (
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(244,237,225,1) 0%, rgba(234,247,246,1) 55%, rgba(255,244,234,1) 100%)',
          color: '#15202b',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '56px',
          width: '100%',
        }}
      >
        <div
          style={{
            color: '#b74f31',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          CodexLink
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Georgia',
              fontSize: 68,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: '#4a5b65',
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.4,
              maxWidth: 900,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    {
      height: 630,
      width: 1200,
    },
  );
}
