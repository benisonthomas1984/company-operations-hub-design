'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useHub } from '@/lib/store'

/** Productivity now lives as a tab on each employee profile; old links land there. */
export function ProductivityRedirect() {
  const { me } = useHub()
  const router = useRouter()
  const person = useSearchParams().get('person') || me.id
  useEffect(() => {
    router.replace(`/employees/${person}?tab=productivity`)
  }, [router, person])
  return null
}
