'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
    text: string
}

export function CopyButton({ text }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="rounded-lg bg-amber-200 px-4 py-2 text-amber-800 hover:bg-amber-300"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
    )
}
