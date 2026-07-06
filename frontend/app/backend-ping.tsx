"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function BackendPing() {
  const [result, setResult] = useState("checking backend...");

  useEffect(() => {
    async function ping() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setResult("no session");
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/me`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        const data = await response.json();
        setResult(
          response.ok
            ? `backend says: ${JSON.stringify(data)}`
            : `backend error: ${JSON.stringify(data)}`,
        );
      } catch {
        setResult("could not reach backend");
      }
    }

    ping();
  }, []);

  return <p className="text-sm text-zinc-600">{result}</p>;
}
