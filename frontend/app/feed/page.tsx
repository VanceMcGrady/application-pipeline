import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostingForm from "./posting-form";

type Posting = {
  id: string;
  company: string;
  title: string;
  raw_text: string;
  source_url: string | null;
  date_added: string;
};

async function fetchList<T>(path: string, token: string): Promise<T[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return [];

  return response.json();
}

function snippet(text: string, maxLength = 240): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  const postings = await fetchList<Posting>("/postings", token);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Job postings</h1>

      <PostingForm />

      {postings.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No postings yet — paste one in above.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {postings.map((posting) => (
            <li key={posting.id} className="flex flex-col gap-1 rounded border p-3 text-sm">
              <span className="font-medium">{posting.title}</span>
              <p className="text-zinc-600">
                {posting.company} · {new Date(posting.date_added).toLocaleDateString()}
              </p>
              <p className="text-zinc-600">{snippet(posting.raw_text)}</p>
              {posting.source_url && (
                <a
                  href={posting.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start text-blue-600 underline"
                >
                  View posting
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
