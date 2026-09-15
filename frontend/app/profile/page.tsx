import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

type Profile = {
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
};

export default async function ProfilePage() {
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

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const profile: Profile | null = response.ok ? await response.json() : null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="text-sm text-zinc-600">
        Used as the header (name and contact info) on rendered resumes.
      </p>
      <ProfileForm profile={profile} />
    </main>
  );
}
