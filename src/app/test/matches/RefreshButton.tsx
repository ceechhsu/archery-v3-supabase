'use client'

export function RefreshButton() {
    return (
        <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
            🔄 Refresh Tests
        </button>
    )
}
