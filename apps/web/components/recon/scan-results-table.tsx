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
} from "@tanstack/react-table";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";

export interface ScanResult {
  id: number;
  tool: string;
  type: string;
  result?: string;
  raw_output?: string;
}

const TOOL_BADGE: Record<string, string> = {
  subfinder: "bg-blue-950 text-blue-400 border border-blue-800",
  httpx:     "bg-purple-950 text-purple-400 border border-purple-800",
  naabu:     "bg-orange-950 text-orange-400 border border-orange-800",
  nuclei:    "bg-red-950 text-red-400 border border-red-800",
  gowitness: "bg-green-950 text-green-400 border border-green-800",
};

interface ScanResultsTableProps {
  data: ScanResult[];
}

export function ScanResultsTable({ data }: ScanResultsTableProps) {
  const [sorting, setSorting]         = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [toolFilter, setToolFilter]   = useState("all");
  const [pageSize, setPageSize]       = useState(25);
  const [pageIndex, setPageIndex]     = useState(0);

  const tools = useMemo(() => Array.from(new Set(data.map((d) => d.tool))).sort(), [data]);

  const filtered = useMemo(
    () => (toolFilter === "all" ? data : data.filter((d) => d.tool === toolFilter)),
    [data, toolFilter]
  );

  const columns = useMemo<ColumnDef<ScanResult>[]>(
    () => [
      {
        accessorKey: "tool",
        header: "Tool",
        size: 110,
        cell: ({ row }) => (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
            TOOL_BADGE[row.original.tool] ?? "bg-zinc-800 text-zinc-400 border border-zinc-700"
          }`}>
            {row.original.tool}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        size: 120,
        cell: ({ row }) => (
          <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {row.original.type}
          </span>
        ),
      },
      {
        id: "value",
        accessorFn: (row) => row.result ?? row.raw_output ?? "",
        header: "Result",
        cell: ({ row }) => {
          const val = row.original.result ?? row.original.raw_output ?? "—";
          return (
            <span className="block max-w-xl truncate font-mono text-[11px] text-zinc-300" title={val}>
              {val}
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
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

  if (data.length === 0) return null;

  return (
    <div className="rounded border border-zinc-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Findings</span>
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
              className="rounded bg-zinc-800 border border-zinc-700 py-1 pl-6 pr-3 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 w-36"
            />
          </div>

          <select
            value={toolFilter}
            onChange={(e) => { setToolFilter(e.target.value); setPageIndex(0); }}
            className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-400 outline-none focus:border-zinc-600"
          >
            <option value="all">all tools</option>
            {tools.map((t) => <option key={t} value={t}>{t}</option>)}
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
                <td colSpan={columns.length} className="py-10 text-center text-xs text-zinc-600">
                  no findings yet.
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
