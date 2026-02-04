"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SignInButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { StatusPill } from "@/components/atoms/StatusPill";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { DashboardShell } from "@/components/templates/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

type Agent = {
  id: string;
  name: string;
  status: string;
  openclaw_session_id?: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

type GatewayStatus = {
  connected: boolean;
  gateway_url: string;
  sessions_count?: number;
  sessions?: Record<string, unknown>[];
  error?: string;
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelative = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const truncate = (value?: string | null, max = 18) => {
  if (!value) return "—";
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
};

export default function AgentsPage() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sortedAgents = useMemo(() => [...agents], [agents]);

  const loadAgents = async () => {
    if (!isSignedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/agents`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!response.ok) {
        throw new Error("Unable to load agents.");
      }
      const data = (await response.json()) as Agent[];
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadGatewayStatus = async () => {
    if (!isSignedIn) return;
    setGatewayError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/gateway/status`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!response.ok) {
        throw new Error("Unable to load gateway status.");
      }
      const statusData = (await response.json()) as GatewayStatus;
      setGatewayStatus(statusData);
    } catch (err) {
      setGatewayError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  useEffect(() => {
    loadAgents();
    loadGatewayStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const handleDelete = async () => {
    if (!deleteTarget || !isSignedIn) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/agents/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!response.ok) {
        throw new Error("Unable to delete agent.");
      }
      setAgents((prev) => prev.filter((agent) => agent.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<Agent>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Agent",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-strong">{row.original.name}</p>
            <p className="text-xs text-quiet">ID {row.original.id}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        accessorKey: "openclaw_session_id",
        header: "Session",
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {truncate(row.original.openclaw_session_id)}
          </span>
        ),
      },
      {
        accessorKey: "last_seen_at",
        header: "Last seen",
        cell: ({ row }) => (
          <div className="text-xs text-muted">
            <p className="font-medium text-strong">
              {formatRelative(row.original.last_seen_at)}
            </p>
            <p className="text-quiet">{formatTimestamp(row.original.last_seen_at)}</p>
          </div>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {formatTimestamp(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              href={`/agents/${row.original.id}`}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[color:var(--border)] px-3 text-xs font-medium text-muted transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            >
              View
            </Link>
            <Link
              href={`/agents/${row.original.id}/edit`}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[color:var(--border)] px-3 text-xs font-medium text-muted transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            >
              Edit
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: sortedAgents,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DashboardShell>
      <SignedOut>
        <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl surface-panel p-10 text-center lg:col-span-2">
          <p className="text-sm text-muted">Sign in to view agents.</p>
          <SignInButton
            mode="modal"
            afterSignInUrl="/agents"
            afterSignUpUrl="/agents"
            forceRedirectUrl="/agents"
            signUpForceRedirectUrl="/agents"
          >
            <Button>Sign in</Button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <DashboardSidebar />
        <div className="flex h-full flex-col gap-6 rounded-2xl surface-panel p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-strong">Agents</h2>
              <p className="text-sm text-muted">
                {agents.length} agent{agents.length === 1 ? "" : "s"} total.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadAgents} disabled={isLoading}>
                Refresh
              </Button>
              <Button onClick={() => router.push("/agents/new")}>
                New agent
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs text-muted">
              {error}
            </div>
          ) : null}

          {agents.length === 0 && !isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-muted)] p-6 text-center text-sm text-muted">
              No agents yet. Create your first agent to get started.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[color:var(--border)] text-sm">
                  <thead className="bg-[color:var(--surface-muted)]">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-quiet"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)] bg-[color:var(--surface)]">
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer transition hover:bg-[color:var(--surface-muted)]"
                        onClick={() => router.push(`/agents/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-top">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-muted">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-quiet">
                  Gateway status
                </p>
                <p className="mt-1 text-sm text-strong">
                  {gatewayStatus?.gateway_url ?? "Gateway URL not set"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={gatewayStatus?.connected ? "online" : "offline"} />
                <span className="text-xs text-quiet">
                  {gatewayStatus?.sessions_count ?? 0} sessions
                </span>
              </div>
            </div>
            {gatewayStatus?.error ? (
              <p className="mt-3 text-xs text-[color:var(--danger)]">
                {gatewayStatus.error}
              </p>
            ) : null}
            {gatewayError ? (
              <p className="mt-3 text-xs text-[color:var(--danger)]">
                {gatewayError}
              </p>
            ) : null}
          </div>
        </div>
      </SignedIn>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent aria-label="Delete agent">
          <DialogHeader>
            <DialogTitle>Delete agent</DialogTitle>
            <DialogDescription>
              This will remove {deleteTarget?.name}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-xs text-muted">
              {deleteError}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
