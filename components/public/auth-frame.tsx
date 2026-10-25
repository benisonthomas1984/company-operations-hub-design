'use client'

import { Brand } from '@/components/shell/app-shell'

export function AuthFrame({ title, description, children, aside }: { title: string; description?: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center px-4 py-4 md:px-6">
        <Brand />
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 pb-12 md:px-6 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 md:p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold text-balance text-foreground">{title}</h1>
            {description && <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>}
          </div>
          {children}
        </section>
        {aside && <aside className="flex flex-col gap-4">{aside}</aside>}
      </main>
    </div>
  )
}
