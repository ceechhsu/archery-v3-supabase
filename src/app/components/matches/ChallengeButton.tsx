'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { ChallengeModal } from './ChallengeModal'

export function ChallengeButton() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-forest to-forest/80 py-4 font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
            >
                <Users className="h-5 w-5" />
                Challenge a Friend
            </button>

            <ChallengeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    // Refresh the page to show the new match
                    window.location.reload()
                }}
            />
        </>
    )
}
