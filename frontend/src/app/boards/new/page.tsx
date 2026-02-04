"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SignInButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { CheckCircle2, RefreshCcw, XCircle } from "lucide-react";

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
import { getApiBaseUrl } from "@/lib/api-base";

const DEFAULT_MAIN_SESSION_KEY = "agent:main:main";
const DEFAULT_WORKSPACE_ROOT = "~/.openclaw";

const apiBase = getApiBaseUrl();

type Board = {
  id: string;
  name: string;
  slug: string;
  gateway_id?: string | null;
};

type Gateway = {
  id: string;
  name: string;
  url: string;
  token?: string | null;
  main_session_key: string;
  workspace_root: string;
  skyll_enabled?: boolean;
};

const validateGatewayUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Gateway URL is required.";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "ws:" && url.protocol !== "wss:") {
      return "Gateway URL must start with ws:// or wss://.";
    }
    if (!url.port) {
      return "Gateway URL must include an explicit port.";
    }
    return null;
  } catch {
    return "Enter a valid gateway URL including port.";
  }
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "board";

export default function NewBoardPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  const [name, setName] = useState("");
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [gatewayId, setGatewayId] = useState<string>("");
  const [createNewGateway, setCreateNewGateway] = useState(false);

  const [gatewayName, setGatewayName] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [gatewayMainSessionKey, setGatewayMainSessionKey] = useState(
    DEFAULT_MAIN_SESSION_KEY
  );
  const [gatewayWorkspaceRoot, setGatewayWorkspaceRoot] = useState(
    DEFAULT_WORKSPACE_ROOT
  );
  const [skyllEnabled, setSkyllEnabled] = useState(false);

  const [gatewayUrlError, setGatewayUrlError] = useState<string | null>(null);
  const [gatewayCheckStatus, setGatewayCheckStatus] = useState<
    "idle" | "checking" | "success" | "error"
  >("idle");
  const [gatewayCheckMessage, setGatewayCheckMessage] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGateway = useMemo(
    () => gateways.find((gateway) => gateway.id === gatewayId) || null,
    [gateways, gatewayId]
  );

  const loadGateways = async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/gateways`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!response.ok) {
        throw new Error("Unable to load gateways.");
      }
      const data = (await response.json()) as Gateway[];
      setGateways(data);
      if (data.length === 0) {
        setCreateNewGateway(true);
      } else if (!createNewGateway && !gatewayId) {
        setGatewayId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  useEffect(() => {
    loadGateways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const runGatewayCheck = async () => {
    const validationError = validateGatewayUrl(gatewayUrl);
    setGatewayUrlError(validationError);
    if (validationError) {
      setGatewayCheckStatus("error");
      setGatewayCheckMessage(validationError);
      return;
    }
    if (!isSignedIn) return;
    setGatewayCheckStatus("checking");
    setGatewayCheckMessage(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        gateway_url: gatewayUrl.trim(),
      });
      if (gatewayToken.trim()) {
        params.set("gateway_token", gatewayToken.trim());
      }
      if (gatewayMainSessionKey.trim()) {
        params.set("gateway_main_session_key", gatewayMainSessionKey.trim());
      }
      const response = await fetch(
        `${apiBase}/api/v1/gateways/status?${params.toString()}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      const data = await response.json();
      if (!response.ok || !data?.connected) {
        setGatewayCheckStatus("error");
        setGatewayCheckMessage(data?.error ?? "Unable to reach gateway.");
        return;
      }
      setGatewayCheckStatus("success");
      setGatewayCheckMessage("Gateway reachable.");
    } catch (err) {
      setGatewayCheckStatus("error");
      setGatewayCheckMessage(
        err instanceof Error ? err.message : "Unable to reach gateway."
      );
    }
  };

  const handleGatewaySelection = (value: string) => {
    if (value === "new") {
      setCreateNewGateway(true);
      setGatewayId("");
      return;
    }
    setCreateNewGateway(false);
    setGatewayId(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Board name is required.");
      return;
    }
    if (!createNewGateway && !gatewayId) {
      setError("Select a gateway before creating a board.");
      return;
    }
    if (createNewGateway) {
      const gatewayValidation = validateGatewayUrl(gatewayUrl);
      setGatewayUrlError(gatewayValidation);
      if (gatewayValidation) {
        setGatewayCheckStatus("error");
        setGatewayCheckMessage(gatewayValidation);
        return;
      }
      if (!gatewayName.trim()) {
        setError("Gateway name is required.");
        return;
      }
      if (!gatewayMainSessionKey.trim()) {
        setError("Main session key is required.");
        return;
      }
      if (!gatewayWorkspaceRoot.trim()) {
        setError("Workspace root is required.");
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      let configId = gatewayId;

      if (createNewGateway) {
        const gatewayResponse = await fetch(`${apiBase}/api/v1/gateways`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            name: gatewayName.trim(),
            url: gatewayUrl.trim(),
            token: gatewayToken.trim() || null,
            main_session_key: gatewayMainSessionKey.trim(),
            workspace_root: gatewayWorkspaceRoot.trim(),
            skyll_enabled: skyllEnabled,
          }),
        });
        if (!gatewayResponse.ok) {
          throw new Error("Unable to create gateway.");
        }
        const createdGateway = (await gatewayResponse.json()) as Gateway;
        configId = createdGateway.id;
      }

      const payload: Partial<Board> = {
        name: trimmedName,
        slug: slugify(trimmedName),
        gateway_id: configId || null,
      };

      const response = await fetch(`${apiBase}/api/v1/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Unable to create board.");
      }
      const created = (await response.json()) as Board;
      router.push(`/boards/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardShell>
      <SignedOut>
        <div className="col-span-2 flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 p-10 text-center">
          <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
            <p className="text-sm text-slate-600">Sign in to create a board.</p>
            <SignInButton
              mode="modal"
              forceRedirectUrl="/boards/new"
              signUpForceRedirectUrl="/boards/new"
            >
              <Button className="mt-4">Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-8 py-6">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-slate-900 tracking-tight">
                Create board
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Boards organize tasks and agents by mission context.
              </p>
            </div>
          </div>

          <div className="p-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                      Board name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Release operations"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900">
                      Gateway <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={createNewGateway ? "new" : gatewayId}
                      onValueChange={handleGatewaySelection}
                    >
                      <SelectTrigger>
                      <SelectValue placeholder="Select a gateway" />
                      </SelectTrigger>
                      <SelectContent>
                        {gateways.map((config) => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ Create new gateway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Gateway details
                  </p>
                  {!createNewGateway && selectedGateway ? (
                    <span className="text-xs text-slate-500">
                      {selectedGateway.url}
                    </span>
                  ) : null}
                </div>

                {createNewGateway ? (
                  <div className="space-y-5">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                          Gateway name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={gatewayName}
                          onChange={(event) => setGatewayName(event.target.value)}
                          placeholder="Primary gateway"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                          Gateway URL <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            value={gatewayUrl}
                            onChange={(event) => setGatewayUrl(event.target.value)}
                            onBlur={runGatewayCheck}
                            placeholder="ws://gateway:18789"
                            disabled={isLoading}
                            className={
                              gatewayUrlError ? "border-red-500" : undefined
                            }
                          />
                          <button
                            type="button"
                            onClick={runGatewayCheck}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Check gateway connection"
                          >
                            {gatewayCheckStatus === "checking" ? (
                              <RefreshCcw className="h-4 w-4 animate-spin" />
                            ) : gatewayCheckStatus === "success" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : gatewayCheckStatus === "error" ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {gatewayUrlError ? (
                          <p className="text-xs text-red-500">{gatewayUrlError}</p>
                        ) : gatewayCheckMessage ? (
                          <p
                            className={
                              gatewayCheckStatus === "success"
                                ? "text-xs text-emerald-600"
                                : "text-xs text-red-500"
                            }
                          >
                            {gatewayCheckMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                          Gateway token
                        </label>
                        <Input
                          value={gatewayToken}
                          onChange={(event) => setGatewayToken(event.target.value)}
                          onBlur={runGatewayCheck}
                          placeholder="Bearer token"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                          Main session key <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={gatewayMainSessionKey}
                          onChange={(event) =>
                            setGatewayMainSessionKey(event.target.value)
                          }
                          placeholder={DEFAULT_MAIN_SESSION_KEY}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">
                          Workspace root <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={gatewayWorkspaceRoot}
                          onChange={(event) =>
                            setGatewayWorkspaceRoot(event.target.value)
                          }
                          placeholder={DEFAULT_WORKSPACE_ROOT}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={skyllEnabled}
                          onChange={(event) => setSkyllEnabled(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                        <span>Enable Skyll dynamic skills</span>
                      </div>
                    </div>
                  </div>
                ) : selectedGateway ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Gateway
                      </p>
                      <p className="mt-1 text-sm text-slate-900">
                        {selectedGateway.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedGateway.url}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Workspace root
                      </p>
                      <p className="mt-1 text-sm text-slate-900">
                        {selectedGateway.workspace_root}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedGateway.main_session_key}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select a gateway or create a new one.
                  </p>
                )}
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/boards")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating…" : "Create board"}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </SignedIn>
    </DashboardShell>
  );
}
