'use client'

import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

export function DashboardCalendar({
    sessionDates,
    selectedDate,
    onSelectDate,
    currentMonth,
    onMonthChange,
}: {
    sessionDates: Date[],
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
                modifiers={{ hasSession: sessionDates }}
                modifiersClassNames={{ hasSession: 'rdp-day_hasSession' }}
                className="w-full flex justify-center max-w-sm"
                disableNavigation={false}
                showOutsideDays={false}
            />
        </div>
    )
}
