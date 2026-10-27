'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { Bold, Code, Heading2, Italic, Link2, List, ListOrdered, Quote, Underline } from 'lucide-react'
import { cn } from '@/lib/utils'

const sanitize = (html: string) =>
  typeof window === 'undefined' ? '' : DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] })

/** Renders an announcement body: sanitized HTML, or plain multi-line text. */
export function RichBody({ body, html, className }: { body: string; html?: boolean; className?: string }) {
  const [clean, setClean] = useState('')
  useEffect(() => setClean(html ? sanitize(body) : ''), [body, html])
  if (!html) return <p className={cn('whitespace-pre-line text-sm leading-relaxed text-foreground', className)}>{body}</p>
  return <div className={cn('rich-body', className)} dangerouslySetInnerHTML={{ __html: clean }} />
}

/** Strips tags for previews and empty checks. */
export const plainText = (body: string, html?: boolean) => (html ? body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : body)

const tools = [
  { cmd: 'bold', icon: Bold, label: 'Bold' },
  { cmd: 'italic', icon: Italic, label: 'Italic' },
  { cmd: 'underline', icon: Underline, label: 'Underline' },
  { cmd: 'formatBlock', arg: 'h2', icon: Heading2, label: 'Heading' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
  { cmd: 'formatBlock', arg: 'blockquote', icon: Quote, label: 'Quote' },
] as const

/** Formatted editor with an HTML-source mode. Value is always HTML. */
export function RichEditor({ value, onChange, invalid, id }: { value: string; onChange: (html: string) => void; invalid?: boolean; id?: string }) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const ref = useRef<HTMLDivElement>(null)
  const initial = useMemo(() => value, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === 'visual' && ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = sanitize(value)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) ref.current.innerHTML = sanitize(initial)
  }, [initial])

  const run = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    if (ref.current) onChange(ref.current.innerHTML)
  }
  const addLink = () => {
    const url = window.prompt('Link address', 'https://')
    if (url && /^https?:\/\//.test(url)) run('createLink', url)
  }

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-md border bg-card', invalid ? 'border-destructive' : 'border-input')}>
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/50 p-1">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            aria-label={t.label}
            disabled={mode === 'html'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(t.cmd, 'arg' in t ? t.arg : undefined)}
            className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
          >
            <t.icon className="size-4" aria-hidden />
          </button>
        ))}
        <button type="button" title="Link" aria-label="Insert link" disabled={mode === 'html'} onMouseDown={(e) => e.preventDefault()} onClick={addLink} className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40">
          <Link2 className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-pressed={mode === 'html'}
          onClick={() => setMode((m) => (m === 'visual' ? 'html' : 'visual'))}
          className={cn('ml-auto flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium', mode === 'html' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background hover:text-foreground')}
        >
          <Code className="size-4" aria-hidden /> HTML
        </button>
      </div>
      {mode === 'visual' ? (
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label="Message"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
          className="rich-body min-h-64 px-4 py-3 font-normal outline-none focus-visible:bg-background"
        />
      ) : (
        <textarea
          id={id}
          aria-label="Message HTML source"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="min-h-64 resize-y bg-background px-4 py-3 font-mono text-xs leading-relaxed text-foreground outline-none"
        />
      )}
    </div>
  )
}
