'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, CalendarDays, Target } from 'lucide-react'
import { isSameDay } from 'date-fns'
import { DashboardCalendar } from './DashboardCalendar'
import { createClient } from '@/utils/supabase/client'

type Session = {
    id: string
    session_date: string
    notes: string | null
    ends: {
        id: string
        photo_url: string | null
        shots: { score: number }[]
    }[]
}

export function DashboardClient({ initialSessions }: { initialSessions: Session[] }) {
    const [sessions, setSessions] = useState<Session[]>(initialSessions)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

    const parseLocalDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    }

    // Extract dates that contain at least one session for Calendar mapping
    const sessionDates = sessions.map(s => parseLocalDate(s.session_date))

    // Filter sessions by the selected date. If no date is selected, filter by the current viewed month.
    const filteredSessions = selectedDate
        ? sessions.filter(s => isSameDay(parseLocalDate(s.session_date), selectedDate))
        : sessions.filter(s => {
            const date = parseLocalDate(s.session_date)
            return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()
        })

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

    return (
        <div>
            {/* Interactive Calendar View */}
            <DashboardCalendar
                sessionDates={sessionDates}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
            />

            <div className="flex items-center justify-between mt-8 mb-6">
                <h2 className="text-xl font-serif font-semibold text-stone-800">
                    {selectedDate
                        ? `Sessions for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Sessions in ${currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}
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

                        const avgScore = totalArrows > 0 ? (totalScore / totalArrows).toFixed(1) : '0'

                        return (
                            <div
                                key={session.id}
                                className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:border-stone-300 hover:shadow-md relative group"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
                                                <CalendarDays className="h-4 w-4" />
                                                {(() => {
                                                    const [y, m, d] = session.session_date.split('-')
                                                    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
                                                    return dateObj.toLocaleDateString(undefined, {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })
                                                })()}
                                            </div>
                                            <p className="mt-1 text-2xl font-bold text-forest">
                                                {totalScore} <span className="text-sm font-normal text-stone-500">pts</span>
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-sm font-medium text-stone-500">
                                                Avg/Arrow
                                            </p>
                                            <p className="mt-1 text-2xl font-bold text-stone-800">
                                                {avgScore}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                                        <div className="flex items-center gap-4 text-sm text-stone-500">
                                            <span className="bg-stone-100 px-2 py-1 rounded-md">{totalArrows} Arrows</span>
                                            <span className="bg-stone-100 px-2 py-1 rounded-md">{session.ends?.length || 0} Ends</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/log?edit=${session.id}`}
                                                className="rounded-full bg-stone-100 p-2 text-stone-500 hover:bg-forest hover:text-white transition-colors shadow-sm"
                                                title="Edit Session"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(session.id)}
                                                className="rounded-full bg-stone-100 p-2 text-stone-500 hover:bg-terracotta hover:text-white transition-colors shadow-sm"
                                                title="Delete Session"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-100/50">
                    <Target className="h-12 w-12 text-stone-300 mb-3" />
                    <h3 className="text-lg font-serif font-semibold text-stone-800">
                        No sessions found
                    </h3>
                    <p className="mt-2 text-sm text-stone-500 text-center max-w-[250px]">
                        {selectedDate ? "No practice logged on this date." : "Get started by logging your first practice."}
                    </p>
                </div>
            )}
        </div>
    )
}
