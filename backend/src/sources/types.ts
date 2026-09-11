export interface NormalizedPosting {
  externalId: string;
  title: string;
  company: string;
  rawText: string;
  sourceUrl: string | null;
  externalUpdatedAt: string;
}

export interface JobSource {
  fetchJobs(boardToken: string, companyName: string): Promise<NormalizedPosting[]>;
}
