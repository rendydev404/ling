export default function AdminLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-lg bg-[#cbd5e1]" />
          <div className="h-4 w-72 max-w-full rounded-lg bg-[#e2e8f0]" />
        </div>
        <div className="h-10 w-32 rounded-xl border-2 border-[#0f172a] bg-[#67e8f9]" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-28 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]"
          />
        ))}
      </div>

      <div className="h-72 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]" />
    </div>
  );
}
