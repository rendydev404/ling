export default function MemberLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-7 w-52 rounded-lg bg-[#cbd5e1]" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-[#e2e8f0]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border-2 border-[#0f172a] bg-white shadow-[4px_4px_0px_#0f172a]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-xl border-2 border-[#0f172a] bg-white shadow-[3px_3px_0px_#0f172a]" />
        ))}
      </div>
    </div>
  );
}
