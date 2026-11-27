export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      <div className="sticky top-0 z-20 border-b-2 border-[#0f172a] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="h-8 w-28 animate-pulse rounded-lg border-2 border-[#0f172a] bg-[#ecfeff]" />
          <div className="h-8 w-28 animate-pulse rounded-lg border-2 border-[#0f172a] bg-[#f3e8ff]" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6 animate-pulse">
        <div className="rounded-2xl border-2 border-[#0f172a] bg-white p-6 sm:p-8 shadow-[5px_5px_0px_#0f172a] space-y-5">
          <div className="h-56 w-full rounded-2xl border-2 border-[#0f172a] bg-[#ecfeff]" />
          <div className="h-6 w-32 rounded-lg bg-[#cbd5e1]" />
          <div className="h-9 w-3/4 rounded-lg bg-[#cbd5e1]" />
          <div className="h-4 w-full rounded-md bg-[#e2e8f0]" />
          <div className="h-20 w-full rounded-2xl border-2 border-[#0f172a] bg-[#ecfeff]" />
        </div>
      </div>
    </div>
  );
}
