'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type Lang = 'en' | 'es'
export const LANG_STORAGE_KEY = 'oh.lang'
const DEFAULT_LANG_STORAGE_KEY = 'oh.lang.default'
const CUSTOM_STORAGE_KEY = 'oh.lang.custom'

type Dict = Record<string, string>

type I18nValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Translate an English UI string for places the DOM translator can't reach (e.g. document.title). */
  t: (text: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'] as const
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE'])
const NUMERIC_EDGE = /^([\s\d.,:%€$£+\-–×/()#·]*)([\s\S]*?)([\s\d.,:%€$£+\-–×/()#·]*)$/

function normalize(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function lookup(dict: Dict, raw: string): string | null {
  const key = normalize(raw)
  if (!key) return null
  const exact = dict[key]
  if (exact !== undefined) return raw.replace(key.length === raw.length ? raw : raw.trim(), exact)
  // Strings with numbers glued on (e.g. "5 unread", "Profit · 2026") — translate the text core.
  const m = key.match(NUMERIC_EDGE)
  if (m && m[2] && (m[1] || m[3])) {
    const core = dict[m[2]] ?? dict[m[2].replace(/[.:]$/, '')]
    if (core !== undefined) return `${m[1]}${core}${m[3]}`
  }
  return null
}

function isSkipped(el: Element | null): boolean {
  for (let n = el; n; n = n.parentElement) {
    if (SKIP_TAGS.has(n.tagName)) return true
    if (n.getAttribute('translate') === 'no' || n.hasAttribute('data-no-translate')) return true
    if ((n as HTMLElement).isContentEditable) return true
  }
  return false
}

/**
 * Swaps English UI text for Spanish directly in the DOM, keeping the originals so English
 * can be restored instantly. Only nodeValue/attributes change, never node identity, so
 * React keeps reconciling normally; when React writes a new English value, the observer
 * re-translates it before paint.
 */
function createTranslator(dict: Dict) {
  const originalText = new WeakMap<Text, string>()
  const writtenText = new WeakMap<Text, string>()
  const originalAttrs = new WeakMap<Element, Map<string, string>>()
  const writtenAttrs = new WeakMap<Element, Map<string, string>>()
  const touched = new Set<WeakRef<Node>>()

  const text = (node: Text) => {
    const value = node.nodeValue ?? ''
    if (writtenText.get(node) === value) return
    if (!/[A-Za-z]/.test(value) || isSkipped(node.parentElement)) return
    const next = lookup(dict, value)
    originalText.set(node, value)
    if (next === null) {
      writtenText.delete(node)
      return
    }
    writtenText.set(node, next)
    touched.add(new WeakRef(node))
    node.nodeValue = next
  }

  const attrs = (el: Element) => {
    for (const name of ATTRS) {
      const value = el.getAttribute(name)
      if (!value) continue
      const written = writtenAttrs.get(el)
      if (written?.get(name) === value) continue
      if (isSkipped(el.parentElement) && name !== 'placeholder') continue
      const next = lookup(dict, value)
      if (next === null) continue
      if (!originalAttrs.has(el)) originalAttrs.set(el, new Map())
      if (!written) writtenAttrs.set(el, new Map())
      originalAttrs.get(el)!.set(name, value)
      writtenAttrs.get(el)!.set(name, next)
      touched.add(new WeakRef(el))
      el.setAttribute(name, next)
    }
  }

  const walk = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) return text(root as Text)
    if (root.nodeType !== Node.ELEMENT_NODE) return
    attrs(root as Element)
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
    for (let n = it.nextNode(); n; n = it.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE) text(n as Text)
      else attrs(n as Element)
    }
  }

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') text(r.target as Text)
      else if (r.type === 'attributes') attrs(r.target as Element)
      else r.addedNodes.forEach(walk)
    }
  })

  return {
    start() {
      walk(document.body)
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] })
    },
    stop() {
      observer.disconnect()
      for (const ref of touched) {
        const n = ref.deref()
        if (!n) continue
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n as Text
          const orig = originalText.get(t)
          if (orig !== undefined && writtenText.get(t) === t.nodeValue) t.nodeValue = orig
        } else {
          const el = n as Element
          originalAttrs.get(el)?.forEach((orig, name) => {
            if (writtenAttrs.get(el)?.get(name) === el.getAttribute(name)) el.setAttribute(name, orig)
          })
        }
      }
      touched.clear()
    },
  }
}

export type TermRule = { find: string; replace: string }
export type Customization = { terms: TermRule[]; phrases: Dict }

export const DEFAULT_CUSTOMIZATION: Customization = {
  terms: [
    { find: 'Dossier de Inteligencia', replace: 'Intelligence Dossier' },
    { find: 'Pendientes y lanzamientos', replace: 'Backlogs & Releases' },
    { find: 'Flujos de trabajo y comités', replace: 'Flujos de trabajo' },
    { find: 'Propietario', replace: 'Dueño' },
  ],
  phrases: {},
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termPattern(find: string) {
  // Leading letter boundary only, so "propietario" also covers "propietarios".
  return new RegExp(`(?<!\\p{L})${escapeRegExp(find.trim())}`, 'giu')
}

export function applyTerm(value: string, rule: TermRule): string {
  if (!rule.find.trim()) return value
  return value.replace(termPattern(rule.find), (match) => {
    const first = match.charAt(0)
    if (first !== first.toUpperCase()) return rule.replace
    return rule.replace.charAt(0).toUpperCase() + rule.replace.slice(1)
  })
}

export function termMatches(value: string, find: string) {
  return !!find.trim() && termPattern(find).test(value)
}

export function buildDict(base: Dict, custom: Customization): Dict {
  const terms = custom.terms.filter((r) => r.find.trim())
  const out: Dict = {}
  for (const [en, es] of Object.entries(base)) out[en] = terms.reduce(applyTerm, es)
  for (const [en, es] of Object.entries(custom.phrases)) if (es.trim()) out[en] = es
  return out
}

export const loadBaseSpanish = () => import('./i18n/es.json').then((m) => m.default as Dict)

type CustomizationValue = {
  defaultLang: Lang
  setDefaultLang: (lang: Lang) => void
  custom: Customization
  setCustom: (next: Customization) => void
}
const CustomizationContext = createContext<CustomizationValue | null>(null)

function readCustomization(): Customization {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Customization>
      return { terms: parsed.terms ?? [], phrases: parsed.phrases ?? {} }
    }
  } catch {}
  return DEFAULT_CUSTOMIZATION
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')
  const [defaultLang, setDefaultLangState] = useState<Lang>('en')
  const [custom, setCustomState] = useState<Customization>(DEFAULT_CUSTOMIZATION)
  const [base, setBase] = useState<Dict | null>(null)
  const translator = useRef<ReturnType<typeof createTranslator> | null>(null)

  useEffect(() => {
    setCustomState(readCustomization())
    const fallback: Lang = localStorage.getItem(DEFAULT_LANG_STORAGE_KEY) === 'es' ? 'es' : 'en'
    setDefaultLangState(fallback)
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    const initial: Lang = stored === 'es' || stored === 'en' ? stored : fallback
    if (initial === 'es') setLangState('es')
    else document.documentElement.removeAttribute('data-i18n-loading')
  }, [])

  useEffect(() => {
    if (lang !== 'es' || base) return
    let cancelled = false
    loadBaseSpanish().then((d) => !cancelled && setBase(d))
    return () => {
      cancelled = true
    }
  }, [lang, base])

  const dict = useMemo(() => (base ? buildDict(base, custom) : null), [base, custom])

  useEffect(() => {
    document.documentElement.lang = lang
    if (lang !== 'es' || !dict) return
    translator.current = createTranslator(dict)
    translator.current.start()
    document.documentElement.removeAttribute('data-i18n-loading')
    return () => {
      translator.current?.stop()
      translator.current = null
    }
  }, [lang, dict])

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(LANG_STORAGE_KEY, next)
    setLangState(next)
  }, [])

  const setDefaultLang = useCallback((next: Lang) => {
    localStorage.setItem(DEFAULT_LANG_STORAGE_KEY, next)
    setDefaultLangState(next)
  }, [])

  const setCustom = useCallback((next: Customization) => {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next))
    setCustomState(next)
  }, [])

  const t = useCallback((s: string) => (lang === 'es' && dict ? (lookup(dict, s) ?? s) : s), [lang, dict])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  const customValue = useMemo(() => ({ defaultLang, setDefaultLang, custom, setCustom }), [defaultLang, setDefaultLang, custom, setCustom])
  return (
    <I18nContext.Provider value={value}>
      <CustomizationContext.Provider value={customValue}>{children}</CustomizationContext.Provider>
    </I18nContext.Provider>
  )
}

export function useLanguageSettings() {
  const ctx = useContext(CustomizationContext)
  if (!ctx) throw new Error('useLanguageSettings must be used inside I18nProvider')
  return ctx
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

/** Runs before hydration so Spanish users don't see an English flash on first load. */
export const i18nBootScript = `try{var l=localStorage.getItem('${LANG_STORAGE_KEY}')||localStorage.getItem('oh.lang.default');if(l==='es'){var d=document.documentElement;d.lang='es';d.setAttribute('data-i18n-loading','');setTimeout(function(){d.removeAttribute('data-i18n-loading')},2500)}}catch(e){}`
