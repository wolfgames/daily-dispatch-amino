export const CHAPTER_ASSET_BASE_PATH = '/chapters';
export const CHAPTER_CATALOG_PATH = `${CHAPTER_ASSET_BASE_PATH}/index.json`;

export interface ChapterCatalogEntry {
  uid: string;
  url: string;
  publishDate: string;
}

export interface ChapterCatalog {
  games: ChapterCatalogEntry[];
}

export interface DailyDispatchCounty {
  uid: string;
  name: string;
  texturePack?: {
    uid: string;
    name: string;
    type: string;
    packFileKey: string;
  };
}

export interface DailyDispatchStory {
  uid: string;
  intro: string;
  headline: string;
  chapterStart: string;
  completion: string;
  funFact?: string;
  imageUrl?: string;
  articleUrl?: string;
}

export interface DailyDispatchLevel {
  uid: string;
  levelNumber: number;
  config: Record<string, unknown>;
  seed: number;
  clues: Array<{
    uid: string;
    text: string;
  }>;
}

export interface DailyDispatchChapter {
  id: number;
  uid: string;
  name: string;
  county: DailyDispatchCounty;
  story: DailyDispatchStory;
  texturePack?: DailyDispatchCounty['texturePack'];
  levels: DailyDispatchLevel[];
}

export interface DailyDispatchChapterFile {
  uid: string;
  name: string;
  chapters: DailyDispatchChapter[];
}

export interface DailyDispatchChapterSummary {
  catalogUid: string;
  chapterUid: string;
  chapterIndex: number;
  chapterCount: number;
  chapterName: string;
  levelUid: string;
  levelNumber: number;
  levelCount: number;
  seed: number;
  intro: string;
  chapterStart: string;
  completion: string;
  headline: string;
  articleUrl: string;
  firstClueText: string;
  countyName: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load Daily Dispatch source data at ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getChapterPath(url: string): string {
  return `${CHAPTER_ASSET_BASE_PATH}/${url}`;
}

export async function loadChapterCatalog(): Promise<ChapterCatalog> {
  return fetchJson<ChapterCatalog>(CHAPTER_CATALOG_PATH);
}

export async function loadChapterByUrl(url: string): Promise<DailyDispatchChapterFile> {
  return fetchJson<DailyDispatchChapterFile>(getChapterPath(url));
}

export async function loadFirstChapterSummary(): Promise<DailyDispatchChapterSummary> {
  const catalog = await loadChapterCatalog();
  const firstEntry = catalog.games[0];
  if (!firstEntry) {
    throw new Error('Daily Dispatch chapter catalog is empty.');
  }

  const chapterFile = await loadChapterByUrl(firstEntry.url);
  const chapter = chapterFile.chapters[0];
  const firstLevel = chapter?.levels[0];
  if (!chapter || !firstLevel) {
    throw new Error(`Daily Dispatch chapter ${firstEntry.url} has no playable level data.`);
  }

  return {
    catalogUid: firstEntry.uid,
    chapterUid: chapter.uid,
    chapterIndex: 0,
    chapterCount: catalog.games.length,
    chapterName: chapter.name,
    levelUid: firstLevel.uid,
    levelNumber: firstLevel.levelNumber,
    levelCount: chapter.levels.length,
    seed: firstLevel.seed,
    intro: chapter.story.intro,
    chapterStart: chapter.story.chapterStart,
    completion: chapter.story.completion,
    headline: chapter.story.headline,
    articleUrl: chapter.story.articleUrl ?? '',
    firstClueText: firstLevel.clues[0]?.text ?? '',
    countyName: chapter.county.name,
  };
}
