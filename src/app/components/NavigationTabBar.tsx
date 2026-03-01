'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, ShoppingBag } from 'lucide-react'

export function NavigationTabBar() {
    const pathname = usePathname()

    return (
        <nav className="flex items-center gap-3 mb-8" aria-label="Primary sections">
            <Link
                href="/log"
                onClick={() => {
                    // Clear any orphaned new session drafts to ensure a clean slate
                    localStorage.removeItem('archery_v3_draft_new')
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm font-semibold transition-all ${pathname === '/log'
                    ? 'border-forest bg-forest text-white shadow-md'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-forest hover:text-forest'
                    }`}
            >
                <Plus className="h-4 w-4" />
                New Session
            </Link>
            <Link
                href="/shop"
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm font-semibold transition-all ${pathname === '/shop'
                    ? 'border-forest bg-forest text-white shadow-md'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-forest hover:text-forest'
                    }`}
            >
                <ShoppingBag className="h-4 w-4" />
                Shop
            </Link>
        </nav>
    )
}
