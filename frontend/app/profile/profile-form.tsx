"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { backendFetch } from "@/lib/backend-fetch";

type Profile = {
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
};

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const form = new FormData(event.currentTarget);
    const payload = {
      full_name: form.get("full_name"),
      email: form.get("email"),
      phone: form.get("phone") || null,
      location: form.get("location") || null,
    };

    const response = await backendFetch("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Could not save profile.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded border p-3 text-sm"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          name="full_name"
          placeholder="Full name"
          defaultValue={profile?.full_name ?? ""}
          required
          className="rounded border px-2 py-1"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          defaultValue={profile?.email ?? ""}
          required
          className="rounded border px-2 py-1"
        />
        <input
          name="phone"
          placeholder="Phone"
          defaultValue={profile?.phone ?? ""}
          className="rounded border px-2 py-1"
        />
        <input
          name="location"
          placeholder="Location"
          defaultValue={profile?.location ?? ""}
          className="rounded border px-2 py-1"
        />
      </div>
      <button
        type="submit"
        className="self-start rounded bg-black px-3 py-1 text-white"
      >
        Save profile
      </button>
      {saved && <p className="text-green-700">Saved.</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
