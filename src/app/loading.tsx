export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      {/* Top Navbar Skeleton */}
      <div className="h-16 border-b-2 border-[#0f172a] bg-white px-4 sm:px-6">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 animate-pulse rounded-xl border-2 border-[#0f172a] bg-[#67e8f9]" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-[#cbd5e1]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-20 animate-pulse rounded-xl border-2 border-[#0f172a] bg-[#ecfeff]" />
            <div className="h-9 w-24 animate-pulse rounded-xl border-2 border-[#0f172a] bg-[#f3e8ff]" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        <div className="rounded-3xl border-2 border-[#0f172a] bg-white p-6 shadow-[6px_6px_0px_#0f172a] space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 animate-pulse rounded-2xl border-2 border-[#0f172a] bg-[#67e8f9]" />
            <div className="space-y-2.5 flex-1">
              <div className="h-6 w-44 animate-pulse rounded-lg bg-[#cbd5e1]" />
              <div className="h-4 w-64 max-w-full animate-pulse rounded-lg bg-[#e2e8f0]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-64 animate-pulse rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
