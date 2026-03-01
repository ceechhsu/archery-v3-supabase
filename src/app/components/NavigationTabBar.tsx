'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavigationTabBar() {
    const pathname = usePathname()

    return (
        <nav className="flex items-center gap-2 mb-6" aria-label="Primary sections">
            <Link
                href="/log"
                onClick={() => {
                    // Clear any orphaned new session drafts to ensure a clean slate
                    localStorage.removeItem('archery_v3_draft_new')
                }}
                className={`flex-1 rounded-xl border p-3 text-center text-sm font-semibold transition-colors ${pathname === '/log'
                    ? 'border-zinc-300 bg-gradient-to-b from-orange-50 to-orange-100/50 text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                    }`}
            >
                New Session
            </Link>
            <Link
                href="/shop"
                className={`flex-1 rounded-xl border p-3 text-center text-sm font-semibold transition-colors ${pathname === '/shop'
                    ? 'border-zinc-300 bg-gradient-to-b from-orange-50 to-orange-100/50 text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                    }`}
            >
                Shop
            </Link>
        </nav>
    )
}
