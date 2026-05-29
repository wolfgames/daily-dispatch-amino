import {
  createCatalogService,
  type CatalogEntry,
} from '../../../../node_modules/@wolfgames/components/src/modules/logic/catalog';
import { createContentLoader } from '../../../../node_modules/@wolfgames/components/src/modules/logic/loader';
import {
  CHAPTER_CATALOG_PATH,
  getChapterPath,
  type ChapterCatalog,
  type ChapterCatalogEntry,
  type DailyDispatchChapter,
  type DailyDispatchChapterFile,
} from '../data/chapters';

export interface DailyDispatchCatalogEntry extends CatalogEntry {
  id: string;
  uid: string;
  url: string;
  publishDate: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(
      `Unable to load Daily Dispatch source data at ${path}: ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

function toCatalogEntry(entry: ChapterCatalogEntry): DailyDispatchCatalogEntry {
  return {
    id: entry.uid,
    uid: entry.uid,
    url: entry.url,
    publishDate: entry.publishDate,
  };
}

const chapterLoader = createContentLoader<
  DailyDispatchChapterFile,
  DailyDispatchChapter
>({
  fetch: (url) => fetchJson<DailyDispatchChapterFile>(getChapterPath(url)),
  transform: (chapterFile) => {
    const chapter = chapterFile.chapters[0];
    if (!chapter) {
      throw new Error(
        `Daily Dispatch chapter file ${chapterFile.uid} has no chapter payload.`,
      );
    }
    return chapter;
  },
});

export function createDailyDispatchStoryCatalog() {
  const catalog = createCatalogService<DailyDispatchCatalogEntry>({
    fetchIndex: async () => {
      const index = await fetchJson<ChapterCatalog>(CHAPTER_CATALOG_PATH);
      return index.games.map(toCatalogEntry);
    },
    fallbackEntries: [],
  });

  return {
    init: catalog.init,
    entries: catalog.entries,
    current: catalog.current,
    currentIndex: catalog.currentIndex,
    setIndex: catalog.setIndex,
    hasNext: catalog.hasNext,
    next: catalog.next,
    findById: catalog.findById,
    async loadChapterAt(index: number): Promise<DailyDispatchChapter> {
      catalog.setIndex(index);
      const entry = catalog.current();
      if (!entry) {
        throw new Error(
          `Daily Dispatch chapter catalog has no entry at index ${index}.`,
        );
      }
      return chapterLoader.load(entry.url);
    },
  };
}

