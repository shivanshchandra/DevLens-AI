import { SectionHeader } from "@/components/dashboard/section-header"

export function TabSectionShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.02] p-4 md:p-5">
      <SectionHeader title={title} description={description} />
      {children}
    </div>
  )
}