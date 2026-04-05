import type { Metadata } from 'next';
import { TranscriptPage } from '../../../components/transcript-page';
import { buildShareMetadata, fetchShare } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const result = await fetchShare(shareId);
  return buildShareMetadata(shareId, result);
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const result = await fetchShare(shareId);
  return <TranscriptPage result={result} />;
}
