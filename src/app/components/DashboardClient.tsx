'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, ChevronDown, ChevronRight, MapPin, FileText, X, Target } from 'lucide-react'
import { isSameDay } from 'date-fns'
import { DashboardCalendar } from './DashboardCalendar'
import { createClient } from '@/utils/supabase/client'

type Shot = {
    score: number
    is_x?: boolean | null
    is_m?: boolean | null
}

type End = {
    id: string
    photo_url: string | null
    shots: Shot[]
}

type Session = {
    id: string
    session_date: string
    display_date: string
    distance: number | null
    notes: string | null
    ends: End[]
    is_match: boolean
    match_id: string | null
    match_score_summary: string | null
    opponent_name?: string | null
    opponent_avatar_url?: string | null
}

// Shot badge color based on archery target scoring
const getShotBadgeColor = (shot: Shot): string => {
    if (shot.is_x || shot.score === 10) return 'bg-[#ffe142] text-yellow-950 border-[#e6c83b]'
    if (shot.score === 9) return 'bg-[#ffe142] text-yellow-950 border-[#e6c83b]'
    if (shot.score === 8 || shot.score === 7) return 'bg-[#f03224] text-white border-[#d92d20]'
    if (shot.score === 6 || shot.score === 5) return 'bg-[#3eb6e6] text-white border-[#2d9fd1]'
    if (shot.score === 4 || shot.score === 3) return 'bg-[#1b1918] text-white border-[#000000]'
    if (shot.score === 2 || shot.score === 1) return 'bg-white text-stone-800 border-stone-300'
    if (shot.is_m || shot.score === 0) return 'bg-stone-200 text-stone-500 border-stone-300'
    return 'bg-stone-100 text-stone-400 border-stone-200'
}

// Format shot display value
const formatShotValue = (shot: Shot): string => {
    if (shot.is_x) return 'X'
    if (shot.is_m) return 'M'
    return shot.score?.toString() || '-'
}

export function DashboardClient({ initialSessions }: { initialSessions: Session[] }) {
    const [sessions, setSessions] = useState<Session[]>(initialSessions)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
    const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    useEffect(() => {
        setSessions(initialSessions)
    }, [initialSessions])

    const parseTimestamp = (value: string): Date => {
        const trimmed = value.trim()
        const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
        const parsed = new Date(normalized)

        if (!Number.isNaN(parsed.getTime())) {
            return parsed
        }

        const [datePart, timePart] = normalized.split('T')
        const [year, month, day] = datePart.split('-').map(Number)

        if (timePart) {
            const timeOnly = timePart.split(/[+-]/)[0].replace('Z', '')
            const [hour = '0', minute = '0', second = '0'] = timeOnly.split(':')
            return new Date(year, (month || 1) - 1, day || 1, Number(hour), Number(minute), Number(second))
        }

        return new Date(year, (month || 1) - 1, day || 1)
    }

    const parseLocalDate = (dateStr: string) => {
        const utcDate = parseTimestamp(dateStr)
        return new Date(
            utcDate.getFullYear(),
            utcDate.getMonth(),
            utcDate.getDate()
        )
    }

    // Extract dates for calendar markers (solo vs match entries)
    const soloDates = sessions
        .filter((s) => !s.is_match)
        .map((s) => parseLocalDate(s.display_date))

    const matchDates = sessions
        .filter((s) => s.is_match)
        .map((s) => parseLocalDate(s.display_date))

    // Filter sessions by the selected date. If no date is selected, filter by the current viewed month.
    const filteredSessions = selectedDate
        ? sessions.filter(s => isSameDay(parseLocalDate(s.display_date), selectedDate))
        : sessions.filter(s => {
            const date = parseLocalDate(s.display_date)
            return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()
        })

    // Toggle session expansion
    const toggleExpanded = (sessionId: string) => {
        setExpandedSessionId(prev => prev === sessionId ? null : sessionId)
    }

    console.log('[DashboardClient] Raw sessions:', sessions.length, sessions)
    console.log('[DashboardClient] Filtered sessions:', filteredSessions.length, filteredSessions)
    console.log('[DashboardClient] Current month:', currentMonth.toISOString())

    // Handle Delete Session
    const handleDelete = async (sessionId: string) => {
        if (!window.confirm("Are you sure you want to delete this session? This cannot be undone.")) {
            return
        }

        const supabase = createClient()

        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId)

        if (error) {
            console.error('Error deleting session:', error)
            alert('Failed to delete session.')
            return
        }

        // Remove from local state
        setSessions(prev => prev.filter(s => s.id !== sessionId))
    }

    // Get photo URL
    const getPhotoUrl = (photoUrl: string | null): string | null => {
        if (!photoUrl || !supabaseUrl) return null
        return `${supabaseUrl}/storage/v1/object/public/session_photos/${photoUrl}`
    }

    return (
        <div>
            {/* Interactive Calendar View */}
            <DashboardCalendar
                soloDates={soloDates}
                matchDates={matchDates}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
            />

            <div className="flex items-center justify-between mt-8 mb-6">
                <h2 className="text-xl font-serif font-semibold text-stone-800">
                    {selectedDate
                        ? `Entries for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Entries in ${currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}
                </h2>
                {selectedDate && (
                    <button
                        onClick={() => setSelectedDate(undefined)}
                        className="text-sm font-medium text-forest hover:text-forest-dark transition-colors"
                    >
                        Show All
                    </button>
                )}
            </div>

            {filteredSessions && filteredSessions.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {filteredSessions.map((session) => {
                        // Calculate statistics for the card
                        let totalArrows = 0
                        let totalScore = 0
                        session.ends?.forEach((end) => {
                            end.shots?.forEach((shot) => {
                                totalArrows++
                                totalScore += shot.score
                            })
                        })

                        const isExpanded = expandedSessionId === session.id

                        return (
                            <div
                                key={session.id}
                                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:border-stone-300 hover:shadow-md relative group"
                            >
                                <div className="p-4">
                                    {/* Two-row layout */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Row 1: Session meta */}
                                            <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
                                                <span className="font-medium text-stone-700">
                                                    {parseTimestamp(session.display_date).toLocaleString(undefined, {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                                <span>·</span>
                                                <span>{totalArrows} Arrows</span>
                                                <span>·</span>
                                                <span>{session.ends?.length || 0} Ends</span>
                                            </div>
                                            
                                            {/* Row 2: Score display */}
                                            {session.is_match && session.match_score_summary ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold text-stone-800">
                                                        You {totalScore} Pts
                                                    </span>
                                                    <span className="text-stone-400">-</span>
                                                    <div className="flex items-center gap-2">
                                                        {session.opponent_avatar_url && (
                                                            <img 
                                                                src={session.opponent_avatar_url} 
                                                                alt={session.opponent_name || 'Opponent'}
                                                                className="w-6 h-6 rounded-full object-cover ring-1 ring-stone-200"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        )}
                                                        <span className="font-medium text-stone-700">{session.opponent_name || 'Opponent'}</span>
                                                        <span className="font-semibold text-stone-800">{session.match_score_summary.split(' - ')[1]} Pts</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-forest">{totalScore} Pts</span>
                                            )}
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {session.is_match && session.match_id ? (
                                                <Link
                                                    href={`/match/${session.match_id}`}
                                                    className="rounded-full p-1.5 text-stone-400 hover:bg-forest hover:text-white transition-colors"
                                                    title="View Match"
                                                >
                                                    <Target className="h-3.5 w-3.5" />
                                                </Link>
                                            ) : (
                                                <>
                                                    <Link
                                                        href={`/log?edit=${session.id}`}
                                                        className="rounded-full p-1.5 text-stone-400 hover:bg-forest hover:text-white transition-colors"
                                                        title="Edit Session"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(session.id)}
                                                        className="rounded-full p-1.5 text-stone-400 hover:bg-terracotta hover:text-white transition-colors"
                                                        title="Delete Session"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {session.is_match && session.match_id ? (
                                        <Link
                                            href={`/match/${session.match_id}`}
                                            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-stone-600 hover:text-forest hover:bg-forest/5 transition-colors border-t border-stone-100 bg-stone-50/50"
                                        >
                                            View Full Match Details
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    ) : (
                                        <>
                                            {/* Expand/Collapse Button for Solo Sessions */}
                                            <button
                                                onClick={() => toggleExpanded(session.id)}
                                                className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-stone-500 hover:text-forest transition-colors border-t border-stone-100"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronDown className="h-4 w-4" />
                                                        Collapse View
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronRight className="h-4 w-4" />
                                                        Expand View
                                                    </>
                                                )}
                                            </button>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-stone-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                    {/* Session Meta Info */}
                                                    {(session.distance || session.notes) && (
                                                        <div className="space-y-2">
                                                            {session.distance && (
                                                                <div className="flex items-center gap-2 text-sm text-stone-600">
                                                                    <MapPin className="h-4 w-4 text-forest" />
                                                                    <span>Distance: <strong>{session.distance}m</strong></span>
                                                                </div>
                                                            )}
                                                            {session.notes && (
                                                                <div className="flex items-start gap-2 text-sm text-stone-600">
                                                                    <FileText className="h-4 w-4 text-forest mt-0.5" />
                                                                    <span className="flex-1">{session.notes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Ends Detail */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">Ends Detail</h4>
                                                        {session.ends?.map((end, endIdx) => {
                                                            const endTotal = end.shots.reduce((acc, shot) => acc + (shot.score || 0), 0)
                                                            const photoUrl = getPhotoUrl(end.photo_url)

                                                            return (
                                                                <div key={end.id} className="bg-stone-50 rounded-xl p-3">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-semibold text-stone-700">End {endIdx + 1}</span>
                                                                        <span className="text-sm font-medium text-forest">{endTotal} pts</span>
                                                                    </div>

                                                                    <div className="flex items-start gap-3">
                                                                        {/* Shots */}
                                                                        <div className="flex-1 flex flex-wrap gap-1">
                                                                            {end.shots.map((shot, shotIdx) => (
                                                                                <span
                                                                                    key={shotIdx}
                                                                                    className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded border ${getShotBadgeColor(shot)}`}
                                                                                    title={`Shot ${shotIdx + 1}: ${formatShotValue(shot)}`}
                                                                                >
                                                                                    {formatShotValue(shot)}
                                                                                </span>
                                                                            ))}
                                                                        </div>

                                                                        {/* Photo Thumbnail */}
                                                                        {photoUrl && (
                                                                            <button
                                                                                onClick={() => setEnlargedPhoto(photoUrl)}
                                                                                className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-stone-200 hover:border-forest transition-colors"
                                                                            >
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img
                                                                                    src={photoUrl}
                                                                                    alt={`End ${endIdx + 1} target`}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-100/50">
                    <Target className="h-12 w-12 text-stone-300 mb-3" />
                    <h3 className="text-lg font-serif font-semibold text-stone-800">
                        No entries found
                    </h3>
                    <p className="mt-2 text-sm text-stone-500 text-center max-w-[250px]">
                        {selectedDate ? "No completed entries on this date." : "Get started by logging your first practice."}
                    </p>
                </div>
            )}

            {/* Enlarged Photo Modal */}
            {enlargedPhoto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setEnlargedPhoto(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setEnlargedPhoto(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-stone-300 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={enlargedPhoto}
                            alt="Enlarged target"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
