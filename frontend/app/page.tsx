import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import BackendPing from "./backend-ping";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-start gap-4 p-8">
      <p>Signed in as {user.email}</p>
      <SignOutButton />
      <BackendPing />
    </main>
  );
}
