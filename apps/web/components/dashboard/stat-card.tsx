interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
          <h2 className="mt-1.5 text-3xl font-bold text-zinc-100">{value.toLocaleString()}</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded border border-zinc-700 bg-zinc-800">
          {icon}
        </div>
      </div>
    </div>
  );
}
