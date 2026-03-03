'use client'

import { useState } from 'react'
import { createMatch } from '@/app/actions/matches'
import { X } from 'lucide-react'

interface ChallengeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function ChallengeModal({ isOpen, onClose, onSuccess }: ChallengeModalProps) {
    const [email, setEmail] = useState('')
    const [distance, setDistance] = useState<string>('18')
    const [endsCount, setEndsCount] = useState<string>('2')
    const [arrowsPerEnd, setArrowsPerEnd] = useState<string>('5')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        const result = await createMatch({
            opponentEmail: email,
            config: {
                distance: parseInt(distance) || 18,
                endsCount: parseInt(endsCount) || 2,
                arrowsPerEnd: parseInt(arrowsPerEnd) || 5,
            },
        })

        setLoading(false)

        if (result.error) {
            setError(result.error)
        } else {
            setSuccess('Challenge sent! Your opponent will receive an email invitation.')
            setTimeout(() => {
                onSuccess()
                onClose()
                setEmail('')
                setDistance('18')
                setEndsCount('2')
                setArrowsPerEnd('5')
                setSuccess('')
            }, 2000)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-stone-800">Challenge a Friend</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Opponent Email */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-stone-700">
                            Opponent Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="friend@example.com"
                            className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                        />
                    </div>

                    {/* Match Configuration */}
                    <div className="rounded-lg bg-stone-50 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-stone-700">
                            Match Configuration
                        </h3>
                        
                        <div className="space-y-3">
                            {/* Distance */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-stone-600">
                                    Distance (meters)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={distance}
                                    onChange={(e) => setDistance(e.target.value)}
                                    placeholder="18"
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-forest focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-stone-400">Common: 18m (indoor), 25m, 30m, 50m, 70m (outdoor)</p>
                            </div>

                            {/* Ends Count */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-stone-600">
                                    Number of Ends
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={endsCount}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        // Remove leading zeros
                                        setEndsCount(value.replace(/^0+/, '') || '0')
                                    }}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-forest focus:outline-none"
                                />
                            </div>

                            {/* Arrows per End */}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-stone-600">
                                    Arrows per End
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={arrowsPerEnd}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        // Remove leading zeros
                                        setArrowsPerEnd(value.replace(/^0+/, '') || '0')
                                    }}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-forest focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                            {success}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full rounded-lg bg-forest py-3 font-medium text-white hover:bg-forest/90 disabled:opacity-50"
                    >
                        {loading ? 'Sending Challenge...' : 'Send Challenge'}
                    </button>
                </form>
            </div>
        </div>
    )
}
