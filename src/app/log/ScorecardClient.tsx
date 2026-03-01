'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Trash2, Camera, AlertCircle, Save } from 'lucide-react'
import imageCompression from 'browser-image-compression'

// Types
type Shot = { score: number | null }
type End = {
    id: string
    shots: Shot[]
    photoFile: File | null
    photoPreview: string | null
}

export function ScorecardClient({ userId }: { userId: string }) {
    const router = useRouter()
    const supabase = createClient()

    // State
    const [isOnline, setIsOnline] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')
    const [ends, setEnds] = useState<End[]>([
        { id: crypto.randomUUID(), shots: Array(5).fill({ score: null }), photoFile: null, photoPreview: null },
    ])

    // Offline Detection & Local Storage Cache
    useEffect(() => {
        setIsOnline(navigator.onLine)
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Load from cache if exists
        const cached = localStorage.getItem('archery_v3_draft')
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                // We can't restore File objects from JSON easily, so we just restore scores/dates
                setDate(parsed.date || new Date().toISOString().split('T')[0])
                setNotes(parsed.notes || '')
                if (parsed.ends) {
                    // Re-attach empty file states since they don't stringify
                    setEnds(parsed.ends.map((e: End) => ({ ...e, photoFile: null, photoPreview: null })))
                }
            } catch (e) {
                console.error('Failed to parse cache', e)
            }
        }

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Auto-save to local storage on change
    useEffect(() => {
        // Exclude File objects before stringifying
        const cacheableEnds = ends.map(e => ({ id: e.id, shots: e.shots }))
        localStorage.setItem('archery_v3_draft', JSON.stringify({ date, notes, ends: cacheableEnds }))
    }, [date, notes, ends])

    // Scoring Logic
    const handleScoreChange = (endIndex: number, shotIndex: number, val: string) => {
        const newEnds = [...ends]
        let score: number | null = null

        if (val.toUpperCase() === 'X' || val === '10') score = 10
        else if (val.toUpperCase() === 'M' || val === '0') score = 0
        else {
            const parsed = parseInt(val)
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) score = parsed
        }

        if (val === '') score = null

        newEnds[endIndex].shots[shotIndex] = { score }
        setEnds(newEnds)
    }

    const addEnd = () => {
        setEnds([
            ...ends,
            { id: crypto.randomUUID(), shots: Array(5).fill({ score: null }), photoFile: null, photoPreview: null },
        ])
    }

    const removeEnd = (index: number) => {
        const newEnds = [...ends]

        // Revoke object URL to prevent memory leaks
        if (newEnds[index].photoPreview) {
            URL.revokeObjectURL(newEnds[index].photoPreview)
        }

        newEnds.splice(index, 1)
        setEnds(newEnds)
    }

    const handlePhotoUpload = async (endIndex: number, file: File) => {
        try {
            // Aggressive Free-tier Client-side Compression
            const options = {
                maxSizeMB: 0.1, // 100KB target to save space
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/jpeg',
            }

            const compressedFile = await imageCompression(file, options)

            const newEnds = [...ends]

            // Cleanup old preview if it exists
            if (newEnds[endIndex].photoPreview) {
                URL.revokeObjectURL(newEnds[endIndex].photoPreview!)
            }

            newEnds[endIndex].photoFile = compressedFile
            newEnds[endIndex].photoPreview = URL.createObjectURL(compressedFile)
            setEnds(newEnds)
        } catch (e) {
            console.error(e)
            alert("Failed to compress image. Please try another.")
        }
    }

    // Calculate Totals
    const calculateEndTotal = (shots: Shot[]) => {
        return shots.reduce((acc, curr) => acc + (curr.score || 0), 0)
    }

    const sessionTotal = ends.reduce((acc, curr) => acc + calculateEndTotal(curr.shots), 0)
    const totalArrows = ends.reduce((acc, curr) => acc + curr.shots.filter(s => s.score !== null).length, 0)

    // Save to Supabase
    const handleSave = async () => {
        if (!isOnline) {
            setError("You are currently offline. Your progress is cached locally.")
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            // 1. Create Session
            const { data: session, error: sessionError } = await supabase
                .from('sessions')
                .insert({
                    user_id: userId,
                    session_date: date,
                    notes: notes
                })
                .select()
                .single()

            if (sessionError) throw sessionError

            const sessionId = session.id

            // 2. Process Ends
            for (let i = 0; i < ends.length; i++) {
                const end = ends[i]
                let photo_url = null

                // 3. Upload Photo if exists
                if (end.photoFile) {
                    const fileExt = 'jpg'
                    const fileName = `${userId}/${sessionId}/${crypto.randomUUID()}.${fileExt}`

                    const { error: uploadError } = await supabase.storage
                        .from('session_photos')
                        .upload(fileName, end.photoFile)

                    if (uploadError) throw uploadError

                    // Get public URL immediately since it's a private bucket, 
                    // we actually just store the relative path and generate signed URLs on the fly later,
                    // but for simplicity, we'll store the object path.
                    photo_url = fileName
                }

                // 4. Create End Record
                const { data: endRecord, error: endError } = await supabase
                    .from('ends')
                    .insert({
                        session_id: sessionId,
                        end_index: i,
                        photo_url: photo_url
                    })
                    .select()
                    .single()

                if (endError) throw endError

                // 5. Create Shots
                const validShots = end.shots
                    .map((shot, shotIdx) => ({
                        end_id: endRecord.id,
                        shot_index: shotIdx,
                        score: shot.score ?? 0 // default empty shots to 0 or we could filter them out
                    }))
                    .filter(s => end.shots[s.shot_index].score !== null) // Only save shots that were entered

                if (validShots.length > 0) {
                    const { error: shotsError } = await supabase
                        .from('shots')
                        .insert(validShots)

                    if (shotsError) throw shotsError
                }
            }

            // Cleanup local storage on success
            localStorage.removeItem('archery_v3_draft')
            router.push('/')
            router.refresh()

        } catch (e: unknown) {
            console.error(e)
            setError(e instanceof Error ? e.message : "An error occurred while saving.")
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Session Meta */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-xl border-zinc-300 bg-transparent px-4 py-2 ring-1 ring-zinc-200 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-700 dark:ring-zinc-800 dark:focus:border-zinc-400"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="How did it feel today?"
                            rows={2}
                            className="w-full rounded-xl border-zinc-300 bg-transparent px-4 py-2 ring-1 ring-zinc-200 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-700 dark:ring-zinc-800 dark:focus:border-zinc-400"
                        />
                    </div>
                </div>
            </div>

            {/* Ends List */}
            <div className="space-y-4">
                {ends.map((end, endIdx) => (
                    <div
                        key={end.id}
                        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/20">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                                End {endIdx + 1}
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    Total: <span className="text-zinc-900 dark:text-zinc-50">{calculateEndTotal(end.shots)}</span>
                                </span>
                                {ends.length > 1 && (
                                    <button
                                        onClick={() => removeEnd(endIdx)}
                                        className="text-red-500 hover:text-red-700 dark:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 flex flex-col sm:flex-row gap-6">
                            {/* Photo Upload Area */}
                            <div className="flex-shrink-0">
                                <label className="cursor-pointer group relative flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/50 transition-all">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handlePhotoUpload(endIdx, e.target.files[0])
                                            }
                                        }}
                                    />
                                    {end.photoPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={end.photoPreview} alt="Target" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <Camera className="mx-auto h-6 w-6 text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500" />
                                            <span className="mt-1 block text-[10px] font-medium text-zinc-500">Target</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {/* Score Inputs */}
                            <div className="flex-1">
                                <div className="grid grid-cols-5 gap-2 h-full items-center">
                                    {end.shots.map((shot, shotIdx) => (
                                        <input
                                            key={shotIdx}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={shot.score === null ? '' : shot.score === 10 ? 'X' : shot.score === 0 ? 'M' : shot.score}
                                            onChange={(e) => handleScoreChange(endIdx, shotIdx, e.target.value)}
                                            placeholder="-"
                                            className="h-12 w-full rounded-xl border-zinc-200 bg-zinc-50 text-center text-lg font-bold text-zinc-900 ring-1 ring-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800 dark:focus:ring-white transition-all placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                                        />
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600 text-center sm:text-left">
                                    Enter 0-10, X (10), or M (0)
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add End Button */}
            <button
                onClick={addEnd}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-4 font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
                <Plus className="h-5 w-5" />
                Add End
            </button>

            {/* Footer Totals & Save */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mx-auto max-w-3xl">
                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex gap-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Score</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{sessionTotal}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Arrows</p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{totalArrows}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || !isOnline}
                            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-all"
                        >
                            {isSaving ? (
                                "Saving..."
                            ) : !isOnline ? (
                                "Offline"
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    Save Session
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
