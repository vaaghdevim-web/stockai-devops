import { PackageCheck } from 'lucide-react'

export function ModulePlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 sm:p-10">
        <PackageCheck className="size-8 text-slate-400" aria-hidden="true" />
        <h2 className="mt-4 font-semibold text-slate-800">Module not yet available</h2>
        <p className="mt-2 text-sm text-slate-500">This workspace is reserved for {title.toLowerCase()}. No operational data is displayed yet.</p>
      </div>
    </section>
  )
}
