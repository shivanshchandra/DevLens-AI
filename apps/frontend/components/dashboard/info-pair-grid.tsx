export function InfoPairGrid({
  items,
}: {
  items: { label: string; value: string | number }[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4"
        >
          <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
            {item.label}
          </div>
          <div className="mt-2 text-sm font-medium text-zinc-200">{item.value}</div>
        </div>
      ))}
    </div>
  )
}