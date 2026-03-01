'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Minus, Trash2, Camera, Image as ImageIcon, AlertCircle, Save } from 'lucide-react'
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
    const [shotsPerEnd, setShotsPerEnd] = useState(5)
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
                setShotsPerEnd(parsed.shotsPerEnd || (parsed.ends?.[0]?.shots?.length) || 5)
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
        localStorage.setItem('archery_v3_draft', JSON.stringify({ date, notes, shotsPerEnd, ends: cacheableEnds }))
    }, [date, notes, shotsPerEnd, ends])

    // Modifer for Shots per End
    const handleShotsPerEndChange = (newTotal: number) => {
        if (newTotal < 3 || newTotal > 12) return
        setShotsPerEnd(newTotal)
        setEnds(ends.map(end => {
            const newShots = [...end.shots]
            if (newTotal > newShots.length) {
                newShots.push(...Array(newTotal - newShots.length).fill({ score: null }))
            } else {
                newShots.length = newTotal
            }
            return { ...end, shots: newShots }
        }))
    }

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
            { id: crypto.randomUUID(), shots: Array(shotsPerEnd).fill({ score: null }), photoFile: null, photoPreview: null },
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-bold tracking-tight text-zinc-900">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full h-[42px] rounded-xl border-zinc-300 bg-transparent px-4 font-medium text-zinc-900 ring-1 ring-zinc-200 focus:border-zinc-500 focus:ring-zinc-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-bold tracking-tight text-zinc-900">
                            Arrows per End
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleShotsPerEndChange(shotsPerEnd - 1)}
                                disabled={shotsPerEnd <= 3}
                                className="flex h-[42px] w-12 items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-600 transition-colors"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-xl font-bold text-zinc-900">{shotsPerEnd}</span>
                            <button
                                onClick={() => handleShotsPerEndChange(shotsPerEnd + 1)}
                                disabled={shotsPerEnd >= 12}
                                className="flex h-[42px] w-12 items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-600 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3 lg:mt-2">
                        <label className="mb-2 block text-sm font-bold tracking-tight text-zinc-900">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="How did it feel today? Any equipment changes?"
                            rows={2}
                            className="w-full rounded-xl border-zinc-300 bg-transparent px-4 py-3 font-medium text-zinc-900 ring-1 ring-zinc-200 focus:border-zinc-500 focus:ring-zinc-500 transition-all resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Ends List */}
            <div className="space-y-4">
                {ends.map((end, endIdx) => (
                    <div
                        key={end.id}
                        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm  "
                    >
                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-4 py-3  ">
                            <h3 className="font-semibold text-zinc-900 ">
                                End {endIdx + 1}
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-zinc-500 ">
                                    Total: <span className="text-zinc-900 ">{calculateEndTotal(end.shots)}</span>
                                </span>
                                {ends.length > 1 && (
                                    <button
                                        onClick={() => removeEnd(endIdx)}
                                        className="text-red-500 hover:text-red-700 "
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 flex flex-col sm:flex-row gap-6">
                            {/* Photo Upload Area */}
                            <div className="flex-shrink-0 sm:self-center">
                                {end.photoPreview ? (
                                    <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-zinc-200 bg-zinc-900 shadow-sm transition-all focus-within:ring-2 focus-within:ring-zinc-900 ">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handlePhotoUpload(endIdx, e.target.files[0])
                                                }
                                            }}
                                        />
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={end.photoPreview} alt="Target" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity backdrop-blur-sm group-hover:opacity-100">
                                            <Camera className="h-6 w-6 text-white" />
                                        </div>
                                    </label>
                                ) : (
                                    <div className="relative flex h-24 w-24 sm:w-28 flex-col overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300  bg-zinc-50  group hover:border-zinc-400 :border-zinc-600 transition-colors shadow-sm">
                                        {/* Camera Target */}
                                        <label className="flex flex-1 cursor-pointer flex-col items-center justify-center border-b border-zinc-200/50 bg-transparent hover:bg-zinc-100  :bg-zinc-800/80 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="sr-only"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handlePhotoUpload(endIdx, e.target.files[0])
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <Camera className="h-4 w-4 text-zinc-500 " />
                                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-600 ">Take</span>
                                            </div>
                                        </label>

                                        {/* Library Target */}
                                        <label className="flex flex-1 cursor-pointer flex-col items-center justify-center bg-transparent hover:bg-zinc-100 :bg-zinc-800/80 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="sr-only"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handlePhotoUpload(endIdx, e.target.files[0])
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <ImageIcon className="h-4 w-4 text-zinc-500 " />
                                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-600 ">Lib</span>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Score Inputs */}
                            <div className="flex-1">
                                <div
                                    className="grid gap-1 sm:gap-2 h-full items-center"
                                    style={{ gridTemplateColumns: `repeat(${shotsPerEnd}, minmax(0, 1fr))` }}
                                >
                                    {end.shots.map((shot, shotIdx) => (
                                        <input
                                            key={shotIdx}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={shot.score === null ? '' : shot.score === 10 ? 'X' : shot.score === 0 ? 'M' : shot.score}
                                            onChange={(e) => handleScoreChange(endIdx, shotIdx, e.target.value)}
                                            placeholder="-"
                                            className={`h-12 w-full rounded-xl border-zinc-200 bg-zinc-50 text-center font-bold text-zinc-900 ring-1 ring-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-all placeholder:font-normal placeholder:text-zinc-300 ${shotsPerEnd > 6 ? 'text-base px-0' : 'text-lg'}`}
                                        />
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-zinc-400  text-center sm:text-left">
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-4 font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900   :bg-zinc-900 :text-zinc-50 transition-colors"
            >
                <Plus className="h-5 w-5" />
                Add End
            </button>

            {/* Footer Totals & Save */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white p-4 shadow-lg  ">
                <div className="mx-auto max-w-3xl">
                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600  ">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex gap-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Score</p>
                                <p className="text-2xl font-bold text-zinc-900 ">{sessionTotal}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Arrows</p>
                                <p className="text-2xl font-bold text-zinc-900 ">{totalArrows}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || !isOnline}
                            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-zinc-800   :bg-zinc-100 transition-all"
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
