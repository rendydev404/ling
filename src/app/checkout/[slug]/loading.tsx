export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-[#f4f8fb]">
      <div className="sticky top-0 z-20 border-b-2 border-[#0f172a] bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="h-8 w-24 animate-pulse rounded-lg border-2 border-[#0f172a] bg-[#ecfeff]" />
          <div className="h-8 w-44 animate-pulse rounded-lg border-2 border-[#0f172a] bg-[#67e8f9]" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
        <div className="lg:col-span-7 space-y-5">
          <div className="h-64 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]" />
          <div className="h-72 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]" />
        </div>
        <div className="lg:col-span-5">
          <div className="h-80 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]" />
        </div>
      </div>
    </div>
  );
}
