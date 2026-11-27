export default function ProductsCatalogLoading() {
  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      <div className="h-16 border-b-2 border-[#0f172a] bg-white px-4 sm:px-6">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between">
          <div className="h-9 w-36 animate-pulse rounded-xl border-2 border-[#0f172a] bg-[#ecfeff]" />
          <div className="h-9 w-28 animate-pulse rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff]" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-40 rounded-3xl border-2 border-[#0f172a] bg-[#67e8f9] shadow-[6px_6px_0px_#0f172a]" />
        <div className="h-24 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="h-72 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
