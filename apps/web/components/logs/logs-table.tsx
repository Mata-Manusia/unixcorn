"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ChevronUpIcon, ChevronDownIcon,
  ChevronLeftIcon, ChevronRightIcon,
  MagnifyingGlassIcon, ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import type { LogEntry } from "@/lib/store";

const LEVEL_BADGE: Record<string, string> = {
  info:  "bg-blue-950 text-blue-400 border border-blue-800",
  error: "bg-red-950 text-red-400 border border-red-800",
  warn:  "bg-yellow-950 text-yellow-400 border border-yellow-800",
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

interface LogsTableProps {
  data: LogEntry[];
}

export function LogsTable({ data }: LogsTableProps) {
  const [sorting, setSorting]           = useState<SortingState>([{ id: "timestamp", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [levelFilter, setLevelFilter]   = useState("all");
  const [pageSize, setPageSize]         = useState(25);
  const [pageIndex, setPageIndex]       = useState(0);

  const filtered = useMemo(
    () => (levelFilter === "all" ? data : data.filter((d) => d.level === levelFilter)),
    [data, levelFilter]
  );

  const columns = useMemo<ColumnDef<LogEntry>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Time",
        size: 180,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-[10px] text-zinc-500">
            {formatTime(row.original.timestamp)}
          </span>
        ),
      },
      {
        accessorKey: "level",
        header: "Level",
        size: 70,
        cell: ({ row }) => (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            LEVEL_BADGE[row.original.level] ?? "bg-zinc-800 text-zinc-400 border border-zinc-700"
          }`}>
            {row.original.level}
          </span>
        ),
      },
      {
        accessorKey: "scan_id",
        header: "Scan ID",
        size: 90,
        cell: ({ row }) =>
          row.original.scan_id ? (
            <span className="font-mono text-[10px] text-zinc-600">{row.original.scan_id.slice(0, 8)}…</span>
          ) : (
            <span className="text-[10px] text-zinc-700">—</span>
          ),
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => (
          <span className="text-xs text-zinc-300">{row.original.message}</span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: true,
  });

  return (
    <div className="rounded border border-zinc-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Activity Log</span>
        <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {table.getFilteredRowModel().rows.length}/{data.length}
        </span>

        <div className="ml-auto flex flex-wrap gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="search…"
              value={globalFilter}
              onChange={(e) => { setGlobalFilter(e.target.value); setPageIndex(0); }}
              className="rounded bg-zinc-800 border border-zinc-700 py-1 pl-6 pr-3 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 w-44"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setPageIndex(0); }}
            className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-400 outline-none focus:border-zinc-600"
          >
            <option value="all">all levels</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
            className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-400 outline-none focus:border-zinc-600"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-800 bg-zinc-900">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500 select-none"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc"  ? <ChevronUpIcon className="h-3 w-3" />
                        : header.column.getIsSorted() === "desc" ? <ChevronDownIcon className="h-3 w-3" />
                        : <ArrowsUpDownIcon className="h-3 w-3 text-zinc-700" />}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-xs text-zinc-700">
                  no activity yet. run a scan to see logs.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="text-[10px] text-zinc-600">
          page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 text-zinc-500 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeftIcon className="h-3 w-3" />
          </button>

          {Array.from({ length: Math.min(table.getPageCount(), 7) }, (_, i) => i).map((i) => (
            <button
              key={i}
              onClick={() => table.setPageIndex(i)}
              className={`h-6 w-6 rounded text-[10px] font-medium transition-colors ${
                table.getState().pagination.pageIndex === i
                  ? "bg-fuchsia-700 text-white"
                  : "border border-zinc-700 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 text-zinc-500 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
          >
            <ChevronRightIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
