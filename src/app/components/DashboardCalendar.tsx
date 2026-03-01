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
        <div className="mt-8 mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex items-center justify-center">
            <style>{`
              .rdp-root {
                  --rdp-accent-color: #09090b;
                  --rdp-accent-background-color: #f4f4f5;
                  --rdp-day_button-border-radius: 999px;
              }
              .rdp-day_button:hover {
                  background-color: #f4f4f5;
              }
              .rdp-today {
                  color: #09090b;
                  font-weight: 800;
                  background-color: #f4f4f5;
              }
              .rdp-day {
                  color: #09090b;
              }
              .rdp-day_outside {
                  color: #a1a1aa;
              }
              .rdp-day_hasSession {
                  position: relative;
              }
              .rdp-day_hasSession::after {
                  content: '';
                  position: absolute;
                  bottom: 4px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 4px;
                  height: 4px;
                  border-radius: 50%;
                  background-color: #09090b;
              }
            `}</style>
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
