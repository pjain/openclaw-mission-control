"use client";

import type { ReactNode } from "react";

import { SignedIn } from "@/auth/clerk";

import { BrandMark } from "@/components/atoms/BrandMark";
import { UserMenu } from "@/components/organisms/UserMenu";

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-page bg-app text-strong">
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 bg-landing-grid opacity-[0.18] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -top-40 right-0 h-72 w-72 rounded-full bg-[color:var(--accent-soft)] blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-[color:var(--surface-strong)] blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
          <header className="flex items-center justify-between gap-4">
            <BrandMark />
            <SignedIn>
              <UserMenu />
            </SignedIn>
          </header>
          <main>{children}</main>
        </div>
      </section>
    </div>
  );
}
