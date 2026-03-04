'use client'

import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

export function DashboardCalendar({
    soloDates,
    matchDates,
    selectedDate,
    onSelectDate,
    currentMonth,
    onMonthChange,
}: {
    soloDates: Date[],
    matchDates: Date[],
    selectedDate?: Date,
    onSelectDate?: (date: Date | undefined) => void,
    currentMonth?: Date,
    onMonthChange?: (month: Date) => void,
}) {
    return (
        <div className="mt-4 mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex items-center justify-center">
            <DayPicker
                mode="single"
                month={currentMonth}
                onMonthChange={onMonthChange}
                selected={selectedDate}
                onSelect={(date) => {
                    // Toggle selection if the same date is clicked again
                    if (onSelectDate) onSelectDate(date);
                }}
                modifiers={{ hasSession: soloDates, hasMatch: matchDates }}
                modifiersClassNames={{ hasSession: 'rdp-day_hasSession', hasMatch: 'rdp-day_hasMatch' }}
                className="w-full flex justify-center max-w-sm"
                disableNavigation={false}
                showOutsideDays={false}
            />
        </div>
    )
}
