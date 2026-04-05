import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptPage } from './transcript-page';
import { buildShareMetadata } from '../lib/api';

describe('web transcript page', () => {
  it('renders transcript content for active shares', () => {
    render(
      <TranscriptPage
        result={{
          state: 'active',
          share: {
            createdAt: '2026-04-04T00:00:00.000Z',
            data: {
              createdAt: '2026-04-04T00:00:00.000Z',
              entries: [
                {
                  createdAt: '2026-04-04T00:00:00.000Z',
                  id: '1',
                  images: [
                    {
                      alt: 'Image 1',
                      src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                    },
                  ],
                  kind: 'message',
                  role: 'user',
                  text: 'Ship it',
                },
                {
                  createdAt: '2026-04-04T00:00:00.500Z',
                  id: '1.5',
                  kind: 'commentary',
                  text: 'Checking the repository structure.',
                },
                {
                  createdAt: '2026-04-04T00:00:01.000Z',
                  id: '2',
                  input: '{}',
                  kind: 'tool_call',
                  toolName: 'shell_command',
                },
                {
                  createdAt: '2026-04-04T00:00:02.000Z',
                  id: '3',
                  kind: 'tool_output',
                  output: 'A'.repeat(500),
                  toolName: 'shell_command',
                  truncated: false,
                },
              ],
              excerpt: 'Ship it',
              id: 'session-1',
              sourceUpdatedAt: '2026-04-04T00:01:00.000Z',
              stats: {
                assistantMessages: 0,
                toolCalls: 1,
                toolOutputs: 1,
                userMessages: 1,
              },
              title: 'Ship it',
            },
            shareId: 'share-1',
            status: 'active',
            updatedAt: '2026-04-04T00:01:00.000Z',
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Ship it' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Image 1' })).toBeTruthy();

    // Work block is collapsed by default — expand it
    fireEvent.click(screen.getByText('Worked'));

    expect(
      screen.getByText('Checking the repository structure.'),
    ).toBeTruthy();
    // Tool call name is rendered as a collapsible
    expect(screen.getByText('shell_command')).toBeTruthy();
    // Click to expand tool output
    fireEvent.click(screen.getByText('shell_command'));
    // Long output shows "Show full output" button
    expect(screen.getByText('Show full output')).toBeTruthy();
    // Preview is truncated with "..."
    expect(
      screen.getByText((content) => {
        return content.startsWith('AAAA') && content.includes('...');
      }),
    ).toBeTruthy();
  });

  it('renders not-found state', () => {
    render(<TranscriptPage result={{ state: 'not-found' }} />);
    expect(screen.getByText('Share not found')).toBeTruthy();
  });

  it('renders revoked state', () => {
    render(<TranscriptPage result={{ state: 'revoked' }} />);
    expect(screen.getByText('Share revoked')).toBeTruthy();
  });

  it('builds metadata for active, revoked, and missing shares', () => {
    const active = buildShareMetadata('share-1', {
      state: 'active',
      share: {
        createdAt: '2026-04-04T00:00:00.000Z',
        data: {
          createdAt: '2026-04-04T00:00:00.000Z',
          entries: [],
          excerpt: 'A safe excerpt',
          id: 'session-1',
          sourceUpdatedAt: '2026-04-04T00:01:00.000Z',
          stats: {
            assistantMessages: 0,
            toolCalls: 0,
            toolOutputs: 0,
            userMessages: 0,
          },
          title: 'Title',
        },
        shareId: 'share-1',
        status: 'active',
        updatedAt: '2026-04-04T00:01:00.000Z',
      },
    });
    expect(active.title).toBe('Title');
    expect(active.openGraph?.images?.[0]).toContain('share-1');

    const revoked = buildShareMetadata('share-1', { state: 'revoked' });
    expect(revoked.title).toBe('Share Revoked');

    const missing = buildShareMetadata('share-1', { state: 'not-found' });
    expect(missing.title).toBe('Share Not Found');
  });
});
