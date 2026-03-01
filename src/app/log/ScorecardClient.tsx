'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Minus, Trash2, Camera, Image as ImageIcon, AlertCircle, Save } from 'lucide-react'
import imageCompression from 'browser-image-compression'

// Types
type Shot = { id?: string, score: number | null, is_x?: boolean, is_m?: boolean }
type End = {
    id: string
    end_index?: number
    shots: Shot[]
    photoFile: File | null
    photoPreview: string | null
    photo_url?: string | null
}

type InitialSessionType = {
    id: string
    session_date: string
    distance: number | null
    notes: string | null
    ends: {
        id: string
        end_index: number
        photo_url: string | null
        shots: {
            id: string
            shot_index: number
            score: number | null
            is_x: boolean
            is_m: boolean
        }[]
    }[]
}

export function ScorecardClient({ userId, initialSession }: { userId: string, initialSession?: InitialSessionType | null }) {
    const router = useRouter()
    const supabase = createClient()

    // State Initialization Handler
    const getDefaultEnds = (): End[] => {
        if (initialSession && initialSession.ends && initialSession.ends.length > 0) {
            return initialSession.ends
                .sort((a, b) => a.end_index - b.end_index)
                .map((end) => ({
                    id: end.id,
                    end_index: end.end_index,
                    photo_url: end.photo_url,
                    photoPreview: end.photo_url && process.env.NEXT_PUBLIC_SUPABASE_URL
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/session_photos/${end.photo_url}`
                        : null,
                    photoFile: null,
                    shots: end.shots
                        .sort((a, b) => a.shot_index - b.shot_index)
                        .map((s) => ({
                            id: s.id,
                            score: s.score,
                            is_x: s.is_x,
                            is_m: s.is_m
                        }))
                }))
        }
        return [{ id: crypto.randomUUID(), shots: Array(5).fill({ score: null }), photoFile: null, photoPreview: null }]
    }

    // State
    const [isOnline, setIsOnline] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const distanceRef = useRef<HTMLInputElement>(null)

    const getLocalDateString = () => {
        const d = new Date()
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const [distance, setDistance] = useState<string>(initialSession?.distance?.toString() || '')
    const [date, setDate] = useState(initialSession?.session_date?.split('T')[0] || getLocalDateString())
    const [notes, setNotes] = useState(initialSession?.notes || '')
    const [shotsPerEnd, setShotsPerEnd] = useState(initialSession?.ends?.[0]?.shots?.length || 5)
    const [ends, setEnds] = useState<End[]>(getDefaultEnds())

    // Active Input tracking for Custom Keypad
    const [activeInput, setActiveInput] = useState<{ endIdx: number; shotIdx: number } | null>(null)

    // Auto-scroll active input into view so keypad doesn't hide it
    useEffect(() => {
        if (activeInput) {
            setTimeout(() => {
                // Scroll the entire End Block into view, not just the tiny box, so it clears the sticky header
                const el = document.getElementById(`end-block-${activeInput.endIdx}`)
                if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 80; // 80px offset for the sticky header
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }, 50)
        }
    }, [activeInput])

    // Offline Detection & Local Storage Cache
    useEffect(() => {
        setIsOnline(navigator.onLine)
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Load from cache if exists
        const draftKey = initialSession?.id ? `archery_v3_draft_${initialSession.id}` : 'archery_v3_draft_new'
        const cached = localStorage.getItem(draftKey)

        // Only load from cache if we are NOT editing a pre-existing session OR if we literally already have a cache for this exact edit session
        if (cached && (!initialSession || localStorage.getItem(`archery_v3_draft_${initialSession.id}`))) {
            try {
                const parsed = JSON.parse(cached)
                // We can't restore File objects from JSON easily, so we just restore scores/dates
                if (parsed.distance) setDistance(parsed.distance)
                if (parsed.date) setDate(parsed.date)
                if (parsed.notes) setNotes(parsed.notes)
                if (parsed.shotsPerEnd) setShotsPerEnd(parsed.shotsPerEnd)
                if (parsed.ends && parsed.ends.length > 0) {
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
    }, [initialSession])

    // Auto-save to local storage on change
    useEffect(() => {
        // Exclude File objects before stringifying
        const draftKey = initialSession?.id ? `archery_v3_draft_${initialSession.id}` : 'archery_v3_draft_new'
        const cacheableEnds = ends.map(e => ({ id: e.id, shots: e.shots }))
        localStorage.setItem(draftKey, JSON.stringify({ distance, date, notes, shotsPerEnd, ends: cacheableEnds }))
    }, [distance, date, notes, shotsPerEnd, ends, initialSession?.id])

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
        let is_x = false
        let is_m = false

        if (val.toUpperCase() === 'X' || val === '10') {
            score = 10
            is_x = val.toUpperCase() === 'X'
        }
        else if (val.toUpperCase() === 'M' || val === '0') {
            score = 0
            is_m = val.toUpperCase() === 'M'
        }
        else {
            const parsed = parseInt(val)
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) score = parsed
        }

        if (val === '') {
            score = null
            is_x = false
            is_m = false
        }

        newEnds[endIndex].shots[shotIndex] = { score, is_x, is_m }
        setEnds(newEnds)
    }

    // Custom Keypad Actions
    const handleKeypadPress = (val: string) => {
        if (!activeInput) return

        handleScoreChange(activeInput.endIdx, activeInput.shotIdx, val)

        // Auto Advance strictly across valid shots
        let nextEnd = activeInput.endIdx
        let nextShot = activeInput.shotIdx + 1

        if (nextShot >= shotsPerEnd) {
            nextEnd++
            nextShot = 0
            if (nextEnd >= ends.length) {
                // Stay on the last box, just hide keypad to confirm finish
                setActiveInput(null)
                return
            }
        }
        setActiveInput({ endIdx: nextEnd, shotIdx: nextShot })
    }

    const handleBackspace = () => {
        if (!activeInput) return

        handleScoreChange(activeInput.endIdx, activeInput.shotIdx, '')

        // Move back
        let prevEnd = activeInput.endIdx
        let prevShot = activeInput.shotIdx - 1

        if (prevShot < 0) {
            prevEnd--
            if (prevEnd < 0) return // Stay at start
            prevShot = shotsPerEnd - 1
        }
        setActiveInput({ endIdx: prevEnd, shotIdx: prevShot })
    }

    const keypadColors = (val: string) => {
        switch (val) {
            case 'X':
            case '10':
            case '9': return 'bg-[#ffe142] text-yellow-950 border-none shadow-sm'; // Gold
            case '8':
            case '7': return 'bg-[#f03224] text-white border-none shadow-sm'; // Red
            case '6':
            case '5': return 'bg-[#3eb6e6] text-white border-none shadow-sm'; // Blue
            case '4':
            case '3': return 'bg-[#1b1918] text-white border-none shadow-sm'; // Black
            case '2':
            case '1': return 'bg-white text-stone-800 border-2 border-stone-200 shadow-sm'; // White
            case 'M': return 'bg-stone-200 text-stone-600 border-none shadow-sm'; // Miss
            default: return 'bg-stone-200 text-stone-800';
        }
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
        setIsSaving(true)
        setError(null)

        try {
            // 1. Upsert Session
            let sessionId = initialSession?.id;

            // Convert date to proper ISO timestamp with timezone
            // Append noon time to avoid midnight boundary issues with timezones
            const sessionDateISO = new Date(`${date}T12:00:00`).toISOString()

            if (sessionId) {
                const { error: sessionError } = await supabase
                    .from('sessions')
                    .update({
                        session_date: sessionDateISO,
                        notes: notes,
                        distance: distance ? parseInt(distance) : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', sessionId)
                if (sessionError) throw sessionError
            } else {
                const { data: session, error: sessionError } = await supabase
                    .from('sessions')
                    .insert({
                        user_id: userId,
                        session_date: sessionDateISO,
                        notes: notes,
                        distance: distance ? parseInt(distance) : null
                    })
                    .select()
                    .single()

                if (sessionError) throw sessionError
                sessionId = session.id
            }

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

                // 4. Upsert End Record
                let endRecordId = end.id
                // Determine if it exists in DB by checking if the id came from the UUID generator or DB
                const isExistingEnd = initialSession?.ends?.find((e) => e.id === endRecordId)

                if (!isExistingEnd) {
                    const { data: newEndRecord, error: endError } = await supabase
                        .from('ends')
                        .insert({
                            session_id: sessionId,
                            end_index: i,
                            photo_url: photo_url
                        })
                        .select()
                        .single()

                    if (endError) throw endError
                    endRecordId = newEndRecord.id
                } else if (photo_url) {
                    // Update only if we have a new photo
                    const { error: endError } = await supabase
                        .from('ends')
                        .update({ photo_url: photo_url })
                        .eq('id', endRecordId)
                    if (endError) throw endError
                }

                // 5. Upsert Shots (To keep things clean during edits, just wipe existing shots for this end and recreate)
                // This guarantees we don't end up with dangling shots if the user reduced shots-per-end
                if (isExistingEnd) {
                    await supabase.from('shots').delete().eq('end_id', endRecordId)
                }

                const validShots = end.shots
                    .map((shot, shotIdx) => ({
                        end_id: endRecordId,
                        shot_index: shotIdx,
                        score: shot.score ?? 0,
                        is_x: shot.is_x ?? false,
                        is_m: shot.is_m ?? false
                    }))
                    .filter(s => end.shots[s.shot_index].score !== null)

                if (validShots.length > 0) {
                    const { error: shotsError } = await supabase
                        .from('shots')
                        .insert(validShots)

                    if (shotsError) throw shotsError
                }
            }

            // Cleanup local storage on success
            const draftKey = initialSession?.id ? `archery_v3_draft_${initialSession.id}` : 'archery_v3_draft_new'
            localStorage.removeItem(draftKey)
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
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-bold tracking-tight text-stone-800">
                            Distance (M)
                        </label>
                        <input
                            ref={distanceRef}
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            placeholder="e.g. 18"
                            className="w-full h-[42px] rounded-xl border-stone-200 bg-transparent px-4 font-medium text-stone-800 ring-1 ring-stone-200 focus:border-forest focus:ring-forest transition-all placeholder:text-stone-300"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-bold tracking-tight text-stone-800">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full h-[42px] rounded-xl border-stone-200 bg-transparent px-4 font-medium text-stone-800 ring-1 ring-stone-200 focus:border-forest focus:ring-forest transition-all"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-bold tracking-tight text-stone-800">
                            Arrows per End
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleShotsPerEndChange(shotsPerEnd - 1)}
                                disabled={shotsPerEnd <= 3}
                                className="flex h-[42px] w-12 items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-600 transition-colors"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-xl font-bold text-stone-800">{shotsPerEnd}</span>
                            <button
                                onClick={() => handleShotsPerEndChange(shotsPerEnd + 1)}
                                disabled={shotsPerEnd >= 12}
                                className="flex h-[42px] w-12 items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-600 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="sm:col-span-full">
                        <label className="mb-2 block text-sm font-bold tracking-tight text-stone-800">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="How did it feel today? Any equipment changes?"
                            rows={2}
                            className="w-full rounded-xl border-stone-200 bg-transparent px-4 py-3 font-medium text-stone-800 ring-1 ring-stone-200 focus:border-forest focus:ring-forest transition-all resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Ends List */}
            <div className="space-y-4">
                {ends.map((end, endIdx) => (
                    <div
                        key={end.id}
                        id={`end-block-${endIdx}`}
                        className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                    >
                        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-stone-800">
                                    End {endIdx + 1}
                                </h3>
                                {/* Minimalist Camera Controls in Header */}
                                <div className="flex items-center gap-1 border-l border-stone-300 pl-3">
                                    <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors">
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
                                        <Camera className="h-4 w-4" />
                                    </label>
                                    <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors">
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
                                        <ImageIcon className="h-4 w-4" />
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-stone-500 hidden sm:inline-block">
                                    Total: <span className="text-stone-800">{calculateEndTotal(end.shots)}</span>
                                </span>
                                {ends.length > 1 && (
                                    <button
                                        onClick={() => removeEnd(endIdx)}
                                        className="text-terracotta hover:text-terracotta-light p-1 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 flex flex-col gap-4">
                            {/* Score Inputs (Full Width Now) */}
                            <div className="w-full">
                                <div
                                    className="grid gap-1 sm:gap-2 items-center"
                                    style={{ gridTemplateColumns: `repeat(${shotsPerEnd}, minmax(0, 1fr))` }}
                                >
                                    {end.shots.map((shot, shotIdx) => {
                                        const isActive = activeInput?.endIdx === endIdx && activeInput?.shotIdx === shotIdx;
                                        return (
                                            <button
                                                key={shotIdx}
                                                id={`shot-box-${endIdx}-${shotIdx}`}
                                                type="button"
                                                onClick={() => {
                                                    if (!distance) {
                                                        alert("Please enter the Distance (M) before logging your scores.")
                                                        distanceRef.current?.focus()
                                                        return
                                                    }
                                                    setActiveInput({ endIdx, shotIdx })
                                                }}
                                                className={`flex h-12 w-full items-center justify-center rounded-xl border-stone-200 font-bold ring-1 ring-stone-200 transition-all duration-200 ${isActive
                                                    ? 'bg-forest text-white ring-2 ring-forest shadow-md scale-105 z-10'
                                                    : 'bg-stone-50 text-stone-800 hover:bg-stone-100'
                                                    } ${shotsPerEnd > 6 ? 'text-base' : 'text-lg'}`}
                                            >
                                                {shot.score === null
                                                    ? <span className="text-stone-300 font-normal">-</span>
                                                    : shot.is_x ? 'X' : shot.is_m ? 'M' : shot.score}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-xs text-stone-400">
                                        Enter 0-10, X (10), or M (0)
                                    </p>
                                    <span className="text-sm font-bold text-stone-800 sm:hidden">
                                        Total: {calculateEndTotal(end.shots)}
                                    </span>
                                </div>
                            </div>

                            {/* Full-width Photo Preview Block (Only visible if photo exists) */}
                            {end.photoPreview && (
                                <div className="relative mt-2 w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-900">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={end.photoPreview} alt="Target" className="max-h-64 w-full object-cover opacity-90" />

                                    {/* Replace Photo Overlay */}
                                    <label className="absolute right-3 top-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white shadow-sm backdrop-blur-md hover:bg-black/80 transition-colors">
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
                                        <Camera className="h-5 w-5" />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add End Button */}
            <button
                onClick={addEnd}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-4 font-medium text-stone-500 hover:border-forest hover:text-forest hover:bg-forest/5 transition-all"
            >
                <Plus className="h-5 w-5" />
                Add End
            </button>

            {/* Helper padding to ensure content isn't hidden behind the sticky footer/keypad */}
            {activeInput ? <div className="h-[360px]" /> : <div className="h-[120px]" />}

            {/* Footer Totals, Save & Keypad */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 transition-transform duration-300">
                {/* Custom Archery Keypad (Shows when an input is active) */}
                {activeInput && (
                    <div className="border-b border-stone-100 bg-stone-50 p-3 sm:p-4">
                        <div className="mx-auto max-w-3xl">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                                    Scoring <span className="text-stone-400 font-normal ml-1">End {activeInput.endIdx + 1}, Arrow {activeInput.shotIdx + 1}</span>
                                </span>
                                <button
                                    onClick={() => setActiveInput(null)}
                                    className="text-xs font-bold text-stone-500 uppercase px-3 py-1.5 bg-stone-200 rounded-lg hover:bg-stone-300 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {['X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M'].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => handleKeypadPress(val)}
                                        className={`flex h-12 sm:h-14 items-center justify-center rounded-xl text-xl font-black active:scale-95 transition-all ${keypadColors(val)}`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                                <button
                                    onClick={handleBackspace}
                                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-stone-200 font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-300 active:scale-95"
                                >
                                    <Trash2 className="h-5 w-5" /> Backspace
                                </button>
                                <button
                                    onClick={() => setActiveInput(null)}
                                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest font-bold text-white shadow-sm transition-colors hover:bg-forest-dark active:scale-95"
                                >
                                    Close Keypad
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Standard Action Bar */}
                <div className="p-4 bg-white pb-safe">
                    <div className="mx-auto max-w-3xl">
                        {error && (
                            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex gap-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total Score</p>
                                    <p className="text-2xl font-bold text-forest">{sessionTotal}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Arrows</p>
                                    <p className="text-2xl font-bold text-stone-800">{totalArrows}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving || !isOnline}
                                className="flex items-center gap-2 rounded-xl bg-forest px-6 py-3 font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-forest-dark transition-all"
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
        </div>
    )
}
