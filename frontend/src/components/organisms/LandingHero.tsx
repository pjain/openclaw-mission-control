"use client";

import { SignInButton, SignedIn, SignedOut } from "@/auth/clerk";

import { HeroCopy } from "@/components/molecules/HeroCopy";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-8 animate-fade-in-up">
        <HeroCopy />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SignedOut>
            <SignInButton
              mode="modal"
              forceRedirectUrl="/onboarding"
              signUpForceRedirectUrl="/onboarding"
            >
              <Button size="lg" className="w-full sm:w-auto">
                Sign in to open mission control
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="text-sm text-muted">
              You&apos;re signed in. Open your boards when you&apos;re ready.
            </div>
          </SignedIn>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-quiet">
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
            Enterprise ready
          </span>
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
            Agent-first ops
          </span>
          <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
            24/7 visibility
          </span>
        </div>
      </div>

      <div className="relative animate-fade-in-up">
        <div className="surface-panel rounded-3xl p-6">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-quiet">
            <span>Command surface</span>
            <span className="rounded-full border border-[color:var(--border)] px-2 py-1 text-[10px]">
              Live
            </span>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-lg font-semibold text-strong">
                Tasks claimed, tracked, delivered.
              </p>
              <p className="text-sm text-muted">
                See every queue, agent, and handoff without chasing updates.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active boards", value: "12" },
                { label: "Agents live", value: "08" },
                { label: "Tasks in flow", value: "46" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-center"
                >
                  <div className="text-xl font-semibold text-strong">
                    {item.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-quiet">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                <span>Signals</span>
                <span>Updated 2m ago</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <div className="flex items-center justify-between">
                  <span>Agent Delta moved task to review</span>
                  <span className="text-quiet">Just now</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Board Growth Ops hit WIP limit</span>
                  <span className="text-quiet">5m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Release tasks stabilized</span>
                  <span className="text-quiet">12m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
