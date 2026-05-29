import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDailyDispatchStoryCatalog } from '~/game/mygame/services/story-content-service';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('daily dispatch story counterpart adapters', () => {
  it('uses the Amino catalog and loader modules to preserve ordered source chapters', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const path = String(url);
      if (path === '/chapters/index.json') {
        return new Response(
          JSON.stringify({
            games: [
              {
                uid: 'dispatch-chapter-1',
                url: 'dispatch-1.json',
                publishDate: '2026-02-10T00:00:00.000Z',
              },
              {
                uid: 'dispatch-chapter-2',
                url: 'dispatch-2.json',
                publishDate: '2026-02-11T00:00:00.000Z',
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (path === '/chapters/dispatch-2.json') {
        return new Response(
          JSON.stringify({
            uid: 'chapter-file-2',
            name: 'Daily Dispatch - Chapter 2',
            chapters: [
              {
                id: 2,
                uid: 'dispatch-chapter-2',
                name: 'Dispatch 2',
                county: { uid: 'county-default', name: 'default' },
                story: {
                  uid: 'story-dispatch-2',
                  intro: 'Source intro stays verbatim.',
                  chapterStart: 'Source chapter start stays verbatim.',
                  completion: 'Source completion stays verbatim.',
                  headline: 'Dispatch 2',
                  articleUrl: '',
                },
                levels: [],
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response('', { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const catalog = createDailyDispatchStoryCatalog();
    await catalog.init();
    const chapter = await catalog.loadChapterAt(1);

    expect(catalog.entries().map((entry) => entry.uid)).toEqual([
      'dispatch-chapter-1',
      'dispatch-chapter-2',
    ]);
    expect(catalog.currentIndex()).toBe(1);
    expect(chapter.story.chapterStart).toBe(
      'Source chapter start stays verbatim.',
    );
    expect(fetchMock).toHaveBeenCalledWith('/chapters/index.json');
    expect(fetchMock).toHaveBeenCalledWith('/chapters/dispatch-2.json');
  });

  it('does not synthesize a hard-coded chapter catalog when source index loading fails', async () => {
    globalThis.fetch = vi.fn(async () => new Response('', { status: 404 })) as typeof fetch;

    const catalog = createDailyDispatchStoryCatalog();
    await catalog.init();

    expect(catalog.entries()).toEqual([]);
    await expect(catalog.loadChapterAt(0)).rejects.toThrow(
      'Daily Dispatch chapter catalog has no entry at index 0.',
    );
  });
});

