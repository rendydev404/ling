export default function OrderStatusLoading() {
  return (
    <div className="min-h-screen px-4 py-10 sm:py-14 flex justify-center bg-[#f4f8fb]">
      <div className="w-full max-w-lg space-y-4 animate-pulse">
        <div className="h-[440px] rounded-2xl border-2 border-[#0f172a] bg-white p-6 shadow-[5px_5px_0px_#0f172a]" />
        <div className="h-24 rounded-2xl border-2 border-[#0f172a] bg-white p-4 shadow-[3px_3px_0px_#0f172a]" />
      </div>
    </div>
  );
}
