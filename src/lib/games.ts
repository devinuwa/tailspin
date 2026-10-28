import { eq, asc, count } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export const DEFAULT_PAGE_SIZE = 6;

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

export function getPageCount(totalCount: number, pageSize = DEFAULT_PAGE_SIZE): number {
    if (totalCount <= 0) {
        return 0;
    }

    return Math.ceil(totalCount / pageSize);
}

/** All games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** Total number of games stored in the catalog. */
export async function getGamesCount(db: Database): Promise<number> {
    const [{ total }] = await db.select({ total: count() }).from(games);
    return Number(total);
}

/** A single page of games ordered by title. */
export async function getGamesPage(db: Database, page: number, pageSize = DEFAULT_PAGE_SIZE): Promise<Game[]> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const rows = await baseGamesQuery(db)
        .orderBy(asc(games.title))
        .limit(safePageSize)
        .offset((safePage - 1) * safePageSize);

    return rows.map(mapGame);
}

/** Total number of pages needed to render the catalog at a given page size. */
export async function getGamesPageCount(db: Database, pageSize = DEFAULT_PAGE_SIZE): Promise<number> {
    const total = await getGamesCount(db);
    return getPageCount(total, pageSize);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
