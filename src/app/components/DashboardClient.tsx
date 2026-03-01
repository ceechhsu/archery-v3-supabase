'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { isSameDay, parseISO } from 'date-fns'
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

    // Extract dates that contain at least one session for Calendar mapping
    const sessionDates = sessions.map(s => parseISO(s.session_date))

    // Filter sessions by the selected date. If no date is selected, filter by the current viewed month.
    const filteredSessions = selectedDate
        ? sessions.filter(s => isSameDay(parseISO(s.session_date), selectedDate))
        : sessions.filter(s => {
            const date = parseISO(s.session_date)
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
        <div className="mx-auto max-w-3xl px-4 py-8 pb-24">

            <Link
                href="/log"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-4 text-base font-semibold text-white shadow-sm hover:bg-zinc-800   :bg-zinc-200 transition-colors"
                onClick={() => {
                    // Quick fix for the "New Session Draft" bug: clear the draft cache explicitly.
                    localStorage.removeItem('archery_v3_draft_new')
                }}
            >
                + Log New Session
            </Link>

            {/* Interactive Calendar View */}
            <DashboardCalendar
                sessionDates={sessionDates}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
            />

            <div className="flex items-center justify-between mt-8 mb-6">
                <h2 className="text-xl font-semibold text-zinc-900 ">
                    {selectedDate
                        ? `Sessions for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Sessions in ${currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`}
                </h2>
                {selectedDate && (
                    <button
                        onClick={() => setSelectedDate(undefined)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 "
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
                        const dateObj = new Date(session.session_date)

                        return (
                            <div
                                key={session.id}
                                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md relative group"
                            >
                                {/* Edit & Delete Actions */}
                                <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                                    <Link
                                        href={`/log?edit=${session.id}`}
                                        className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                                        title="Edit Session"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="rounded-full p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                        title="Delete Session"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-zinc-500 ">
                                                {(() => {
                                                    const [y, m, d] = session.session_date.split('-')
                                                    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
                                                    return dateObj.toLocaleDateString(undefined, {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })
                                                })()}
                                            </p>
                                            <p className="mt-1 text-2xl font-semibold text-zinc-900 ">
                                                {totalScore} <span className="text-sm font-normal text-zinc-500 ">pts</span>
                                            </p>
                                        </div>

                                        <div className="text-right pr-12">
                                            <p className="text-sm font-medium text-zinc-500 ">
                                                Avg/Arrow
                                            </p>
                                            <p className="mt-1 text-2xl font-semibold text-zinc-900 ">
                                                {avgScore}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 ">
                                        <div>{totalArrows} Arrows</div>
                                        <div>•</div>
                                        <div>{session.ends?.length || 0} Ends</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50  ">
                    <h3 className="mt-4 text-lg font-semibold text-zinc-900 ">
                        No sessions found
                    </h3>
                    <p className="mt-2 text-sm text-zinc-500 text-center max-w-[250px]">
                        {selectedDate ? "No practice logged on this date." : "Get started by logging your first practice."}
                    </p>
                </div>
            )}
        </div>
    )
}
