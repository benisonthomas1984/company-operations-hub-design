'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { StateBlock } from '@/components/hub/page'
import { Panel, StatusPill } from '@/components/hub/primitives'
import { TextInput } from '@/components/hub/form'
import { DEFAULT_CUSTOMIZATION, applyTerm, loadBaseSpanish, termMatches, useI18n, useLanguageSettings, type Lang, type TermRule } from '@/lib/i18n'

type Dict = Record<string, string>

export function LanguageSettings() {
  const { can } = useHub()
  if (!can('language')) return <StateBlock title="Owner only" body="Only the company owner can manage system languages and translations." />
  return <LanguageSettingsInner />
}

function LanguageSettingsInner() {
  const [base, setBase] = useState<Dict | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBaseSpanish().then((d) => !cancelled && setBase(d))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <SystemLanguages total={base ? Object.keys(base).length : null} />
      <WordReplacements base={base} />
      <PhraseOverrides base={base} />
    </div>
  )
}

function SystemLanguages({ total }: { total: number | null }) {
  const { defaultLang, setDefaultLang, custom } = useLanguageSettings()
  const { lang, setLang } = useI18n()
  const phraseCount = Object.values(custom.phrases).filter((v) => v.trim()).length
  const languages: { id: Lang; name: string; native: string; detail: string }[] = [
    { id: 'en', name: 'English', native: 'English', detail: 'Source language of the app' },
    {
      id: 'es',
      name: 'Spanish',
      native: 'Español',
      detail: total === null ? 'Loading…' : `${total} strings · ${custom.terms.length} word replacements · ${phraseCount} phrase edits`,
    },
  ]

  const choose = (id: Lang) => {
    setDefaultLang(id)
    toast.success(`Default language set to ${id === 'es' ? 'Spanish' : 'English'}`, { description: 'Used for anyone who has not picked a language in the header.' })
  }

  return (
    <Panel title="System languages" description="The default applies to everyone until they switch language from the header.">
      <div role="radiogroup" aria-label="Default system language" className="flex flex-col divide-y divide-border">
        {languages.map((l) => {
          const isDefault = defaultLang === l.id
          return (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span translate="no">{l.native}</span>
                  {isDefault && <StatusPill status="Default" tone="success" />}
                  {lang === l.id && <StatusPill status="Your view" tone="info" />}
                </span>
                <span className="text-xs text-muted-foreground">{l.detail}</span>
              </div>
              <div className="flex items-center gap-2">
                {lang !== l.id && (
                  <Button size="sm" variant="ghost" onClick={() => setLang(l.id)}>
                    Preview
                  </Button>
                )}
                <Button size="sm" variant={isDefault ? 'secondary' : 'outline'} role="radio" aria-checked={isDefault} disabled={isDefault} onClick={() => choose(l.id)}>
                  {isDefault ? 'Default' : 'Make default'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function WordReplacements({ base }: { base: Dict | null }) {
  const { custom, setCustom } = useLanguageSettings()
  const [draft, setDraft] = useState<TermRule>({ find: '', replace: '' })
  const values = useMemo(() => (base ? Object.values(base) : []), [base])
  const affected = (find: string) => values.filter((v) => termMatches(v, find)).length

  const save = (terms: TermRule[]) => setCustom({ ...custom, terms })

  const add = () => {
    const find = draft.find.trim()
    const replace = draft.replace.trim()
    if (!find || !replace) return toast.error('Enter both the Spanish word and its replacement')
    if (custom.terms.some((t) => t.find.toLowerCase() === find.toLowerCase())) return toast.error('That word already has a replacement')
    save([...custom.terms, { find, replace }])
    setDraft({ find: '', replace: '' })
    toast.success('Word replacement added', { description: `${affected(find)} translations updated` })
  }

  return (
    <Panel
      title="Word replacements"
      description="Swap a Spanish word or phrase everywhere it appears. Matching ignores case and keeps capitals at the start of sentences."
      action={
        <Button size="sm" variant="ghost" onClick={() => save(DEFAULT_CUSTOMIZATION.terms)}>
          <RotateCcw aria-hidden />
          Restore suggested
        </Button>
      }
    >
      <div className="flex flex-col">
        <div className="hidden grid-cols-[1fr_1fr_auto_auto] gap-3 border-b border-border px-4 py-2 text-xs text-muted-foreground sm:grid">
          <span>System Spanish</span>
          <span>Show instead</span>
          <span className="w-20 text-right">Applies to</span>
          <span className="w-8" />
        </div>
        {custom.terms.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No word replacements yet.</p>}
        {custom.terms.map((t, i) => (
          <div key={t.find} translate="no" className="grid grid-cols-1 items-center gap-2 border-b border-border px-4 py-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:gap-3">
            <span className="text-sm">{t.find}</span>
            <TextInput
              aria-label={`Replacement for ${t.find}`}
              defaultValue={t.replace}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (!v || v === t.replace) return
                save(custom.terms.map((x, j) => (j === i ? { ...x, replace: v } : x)))
                toast.success('Replacement updated')
              }}
            />
            <span className="w-20 text-xs text-muted-foreground sm:text-right">{base ? `${affected(t.find)} strings` : '…'}</span>
            <Button size="icon" variant="ghost" aria-label={`Remove replacement for ${t.find}`} onClick={() => save(custom.terms.filter((_, j) => j !== i))}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <form
          className="grid grid-cols-1 items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <TextInput placeholder="e.g. Propietario" aria-label="Spanish word to replace" value={draft.find} onChange={(e) => setDraft({ ...draft, find: e.target.value })} />
          <TextInput placeholder="e.g. Dueño" aria-label="Replacement" value={draft.replace} onChange={(e) => setDraft({ ...draft, replace: e.target.value })} />
          <Button type="submit" size="sm">
            <Plus aria-hidden />
            Add
          </Button>
        </form>
      </div>
    </Panel>
  )
}

const PAGE = 40

function PhraseOverrides({ base }: { base: Dict | null }) {
  const { custom, setCustom } = useLanguageSettings()
  const [query, setQuery] = useState('')
  const [onlyEdited, setOnlyEdited] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    if (!base) return []
    const q = query.trim().toLowerCase()
    return Object.entries(base)
      .filter(([en]) => !en.includes('&apos;') && !en.includes('&quot;'))
      .map(([en, es]) => ({ en, system: custom.terms.reduce(applyTerm, es), edited: custom.phrases[en] }))
      .filter((r) => (!onlyEdited || r.edited) && (!q || r.en.toLowerCase().includes(q) || r.system.toLowerCase().includes(q) || r.edited?.toLowerCase().includes(q)))
      .sort((a, b) => a.en.localeCompare(b.en))
  }, [base, custom, query, onlyEdited])

  const setPhrase = (en: string, value: string | null) => {
    const phrases = { ...custom.phrases }
    if (value === null) delete phrases[en]
    else phrases[en] = value
    setCustom({ ...custom, phrases })
  }

  return (
    <Panel title="Phrase translations" description="Change the Spanish text of one specific label, button or message. Phrase edits win over word replacements.">
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <TextInput
            type="search"
            placeholder="Search English or Spanish…"
            aria-label="Search translations"
            className="min-w-48 flex-1"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={onlyEdited} onChange={(e) => setOnlyEdited(e.target.checked)} />
            Edited only
          </label>
          <span className="text-xs text-muted-foreground">{base ? `${rows.length} phrases` : 'Loading…'}</span>
        </div>
        <div className="hidden grid-cols-2 gap-3 border-b border-border px-4 py-2 text-xs text-muted-foreground sm:grid">
          <span>English</span>
          <span>Spanish</span>
        </div>
        <ul translate="no" className="flex flex-col">
          {rows.slice(0, limit).map((r) => (
            <li key={r.en} className="grid grid-cols-1 items-start gap-2 border-b border-border px-4 py-3 sm:grid-cols-2 sm:gap-3">
              <span className="text-pretty pt-2 text-sm leading-relaxed">{r.en}</span>
              <div className="flex items-start gap-2">
                <TextInput
                  key={`${r.en}:${r.edited ?? r.system}`}
                  aria-label={`Spanish for ${r.en}`}
                  defaultValue={r.edited ?? r.system}
                  className={r.edited ? 'border-primary' : undefined}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (!v || v === (r.edited ?? r.system)) return
                    setPhrase(r.en, v === r.system ? null : v)
                    toast.success('Translation saved')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) e.currentTarget.blur()
                  }}
                />
                {r.edited && (
                  <Button size="icon" variant="ghost" aria-label={`Reset ${r.en} to system translation`} onClick={() => setPhrase(r.en, null)}>
                    <RotateCcw aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {rows.length > limit && (
          <div className="p-4">
            <Button size="sm" variant="outline" onClick={() => setLimit(limit + PAGE)}>
              Show more
            </Button>
          </div>
        )}
        {base && rows.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No phrases match.</p>}
      </div>
    </Panel>
  )
}
