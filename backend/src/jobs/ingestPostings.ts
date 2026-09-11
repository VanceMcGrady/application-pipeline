import type { BoardConfig } from "../boardsConfig.js";
import { trackedBoards } from "../boardsConfig.js";
import { sources } from "../sources/index.js";
import type { JobSource } from "../sources/index.js";
import { getServiceSupabaseClient } from "../supabaseClients.js";

export interface BoardIngestionResult {
  source: string;
  boardToken: string;
  fetched: number;
  upserted: number;
  error?: string;
}

/**
 * Polls each configured ATS board, upserting new/changed postings via the
 * service-role client (the "genuinely unscoped operation" that key is
 * reserved for per CLAUDE.md). One board's failure is logged and skipped
 * rather than aborting the whole run.
 */
export async function runIngestion(
  boards: BoardConfig[] = trackedBoards,
  sourceRegistry: Record<string, JobSource> = sources,
): Promise<BoardIngestionResult[]> {
  const client = getServiceSupabaseClient();
  const results: BoardIngestionResult[] = [];

  if (boards.length === 0) {
    return results;
  }

  const { data: upsertedBoards, error: boardsError } = await client
    .from("ats_boards")
    .upsert(
      boards.map((board) => ({
        source: board.source,
        board_token: board.boardToken,
        company_name: board.companyName,
      })),
      { onConflict: "source,board_token" },
    )
    .select("id, source, board_token");
  if (boardsError || !upsertedBoards) {
    throw new Error(`Failed to upsert ats_boards catalog: ${boardsError?.message}`);
  }

  const boardIdByKey = new Map(
    upsertedBoards.map((row) => [`${row.source}:${row.board_token}`, row.id as string]),
  );

  for (const board of boards) {
    const boardId = boardIdByKey.get(`${board.source}:${board.boardToken}`);
    try {
      const adapter = sourceRegistry[board.source];
      if (!adapter) {
        throw new Error(`No source adapter registered for "${board.source}"`);
      }

      const fetched = await adapter.fetchJobs(board.boardToken, board.companyName);

      let toUpsert = fetched;
      if (fetched.length > 0) {
        const { data: existing, error: existingError } = await client
          .from("postings")
          .select("external_id, external_updated_at")
          .eq("source", board.source)
          .in(
            "external_id",
            fetched.map((posting) => posting.externalId),
          );
        if (existingError) {
          throw new Error(`Failed to load existing postings: ${existingError.message}`);
        }

        const existingUpdatedAt = new Map(
          (existing ?? []).map((row) => [row.external_id as string, row.external_updated_at as string]),
        );
        toUpsert = fetched.filter((posting) => {
          const previous = existingUpdatedAt.get(posting.externalId);
          return !previous || new Date(previous).getTime() !== new Date(posting.externalUpdatedAt).getTime();
        });
      }

      if (toUpsert.length > 0) {
        const { error: upsertError } = await client.from("postings").upsert(
          toUpsert.map((posting) => ({
            company: posting.company,
            title: posting.title,
            raw_text: posting.rawText,
            source_url: posting.sourceUrl,
            source: board.source,
            external_id: posting.externalId,
            external_updated_at: posting.externalUpdatedAt,
          })),
          { onConflict: "source,external_id" },
        );
        if (upsertError) {
          throw new Error(`Failed to upsert postings: ${upsertError.message}`);
        }
      }

      if (boardId) {
        await client
          .from("ats_boards")
          .update({ last_polled_at: new Date().toISOString() })
          .eq("id", boardId);
      }

      results.push({
        source: board.source,
        boardToken: board.boardToken,
        fetched: fetched.length,
        upserted: toUpsert.length,
      });
    } catch (err) {
      results.push({
        source: board.source,
        boardToken: board.boardToken,
        fetched: 0,
        upserted: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const results = await runIngestion();
  for (const result of results) {
    if (result.error) {
      console.error(`[ingest] ${result.source}:${result.boardToken} failed — ${result.error}`);
    } else {
      console.log(
        `[ingest] ${result.source}:${result.boardToken} — fetched ${result.fetched}, upserted ${result.upserted}`,
      );
    }
  }
  process.exit(results.some((result) => result.error) ? 1 : 0);
}
