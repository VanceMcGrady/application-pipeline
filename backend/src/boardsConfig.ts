export interface BoardConfig {
  source: string;
  boardToken: string;
  companyName: string;
}

// Curated list of ATS boards to poll daily. Add companies here — the board
// token is the slug in a company's public Greenhouse job board URL, e.g.
// boards.greenhouse.io/{boardToken}. The ingestion job upserts this list
// into ats_boards on every run, so this file is the source of truth for the
// catalog.
export const trackedBoards: BoardConfig[] = [
  // { source: "greenhouse", boardToken: "stripe", companyName: "Stripe" },
];
