"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { SignInButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";

import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { DashboardShell } from "@/components/templates/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

type Agent = {
  id: string;
  name: string;
  status: string;
};

const statusOptions = [
  { value: "online", label: "Online" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
];

export default function EditAgentPage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const agentIdParam = params?.agentId;
  const agentId = Array.isArray(agentIdParam) ? agentIdParam[0] : agentIdParam;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("online");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgent = async () => {
    if (!isSignedIn || !agentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/agents/${agentId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!response.ok) {
        throw new Error("Unable to load agent.");
      }
      const data = (await response.json()) as Agent;
      setAgent(data);
      setName(data.name);
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, agentId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn || !agentId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Agent name is required.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/agents/${agentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name: trimmed, status }),
      });
      if (!response.ok) {
        throw new Error("Unable to update agent.");
      }
      router.push(`/agents/${agentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardShell>
      <SignedOut>
        <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl surface-panel p-10 text-center lg:col-span-2">
          <p className="text-sm text-muted">Sign in to edit agents.</p>
          <SignInButton
            mode="modal"
            afterSignInUrl={`/agents/${agentId}/edit`}
            afterSignUpUrl={`/agents/${agentId}/edit`}
            forceRedirectUrl={`/agents/${agentId}/edit`}
            signUpForceRedirectUrl={`/agents/${agentId}/edit`}
          >
            <Button>Sign in</Button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <DashboardSidebar />
        <div className="flex h-full flex-col justify-center rounded-2xl surface-panel p-8">
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-quiet">
              Edit agent
            </p>
            <h1 className="text-2xl font-semibold text-strong">
              {agent?.name ?? "Agent"}
            </h1>
            <p className="text-sm text-muted">
              Update the agent name and status.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-strong">Agent name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Deploy bot"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-strong">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? (
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs text-muted">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving…" : "Save changes"}
            </Button>
          </form>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/agents/${agentId}`)}
          >
            Back to agent
          </Button>
        </div>
      </SignedIn>
    </DashboardShell>
  );
}
