"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/client/supabase";
import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEPARTMENTS, CLINICIAN_ROLES } from "@triageai/shared";
import type { ClinicianRole, Department } from "@triageai/shared";

type FormState = "idle" | "loading" | "success" | "error";

export default function SignInPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [clinicianRole, setClinicianRole] = useState<ClinicianRole>("clinician");

  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!department) {
      setError("Please select a department.");
      return;
    }

    setState("loading");
    setError(null);

    const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "clinician",
          full_name,
          department,
          clinician_role: clinicianRole,
        },
      },
    });

    if (signUpError) {
      setState("error");
      setError(signUpError.message);
      return;
    }

    // Supabase returns a session immediately if email confirmation is disabled,
    // or a user-but-no-session if confirmation is required.
    if (data.session) {
      // Confirmed immediately — redirect to dashboard
      router.replace("/");
    } else {
      // Email confirmation required
      setState("success");
      setSuccessMessage(
        "Account created! Check your email to confirm your address, then sign in.",
      );
    }
  }

  if (state === "success" && successMessage) {
    return (
      <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
        <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md">
          <div className="p-8">
            <LogoIcon />
            <h1 className="mb-2 mt-4 text-xl font-semibold">Check your email</h1>
            <p className="text-sm text-zinc-600">{successMessage}</p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">Go to Sign In</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form
        onSubmit={onSubmit}
        className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]"
      >
        <div className="p-8 pb-6">
          <div>
            <Link href="/" aria-label="go home">
              <LogoIcon />
            </Link>
            <h1 className="mb-1 mt-4 text-xl font-semibold">Create a TriageAI Account</h1>
            <p className="text-sm">Clinician registration — all fields required</p>
          </div>

          <hr className="my-4 border-dashed" />

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstname" className="block text-sm">
                  First Name
                </Label>
                <Input
                  type="text"
                  required
                  id="firstname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname" className="block text-sm">
                  Last Name
                </Label>
                <Input
                  type="text"
                  required
                  id="lastname"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm">
                Email
              </Label>
              <Input
                type="email"
                required
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pwd" className="text-sm">
                Password
              </Label>
              <Input
                type="password"
                required
                id="pwd"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="block text-sm">
                Department
              </Label>
              <select
                id="department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm capitalize"
              >
                <option value="" disabled>
                  Select department…
                </option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d} className="capitalize">
                    {d.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicianRole" className="block text-sm">
                Role
              </Label>
              <select
                id="clinicianRole"
                value={clinicianRole}
                onChange={(e) => setClinicianRole(e.target.value as ClinicianRole)}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm capitalize"
              >
                {CLINICIAN_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button className="w-full" type="submit" disabled={state === "loading"}>
              {state === "loading" ? "Creating account…" : "Create Account"}
            </Button>
          </div>
        </div>

        <div className="bg-muted rounded-(--radius) border p-3">
          <p className="text-accent-foreground text-center text-sm">
            Already have an account?
            <Button asChild variant="link" className="px-2">
              <Link href="/login">Sign In</Link>
            </Button>
          </p>
        </div>
      </form>
    </section>
  );
}
