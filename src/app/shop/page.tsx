import Image from "next/image";
import Link from "next/link";
import { NavigationTabBar } from "../components/NavigationTabBar";
import { shopProducts, ShopProduct } from "@/lib/shop-products";

// Group products by category
const shopByCategory = shopProducts.reduce((acc, product) => {
    if (!acc.has(product.category)) {
        acc.set(product.category, []);
    }
    acc.get(product.category)!.push(product);
    return acc;
}, new Map<string, ShopProduct[]>());

export default function ShopPage() {
    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900 hover:text-zinc-600 transition-colors">
                            ArrowLog
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
                <NavigationTabBar />

                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 mb-8">
                    <h2 className="text-xl font-semibold text-zinc-900 mb-2">Recommended Gear</h2>
                    <p className="text-sm text-zinc-500 max-w-2xl leading-relaxed">
                        As an Amazon Associate, I earn from qualifying purchases. I only share items I would personally recommend to developing archers to keep the sport accessible.
                    </p>
                </div>

                <div className="space-y-10">
                    {Array.from(shopByCategory.entries()).map(([category, products]) => (
                        <section key={category}>
                            <h3 className="mb-4 text-lg font-bold text-zinc-900 border-b border-zinc-200 pb-2">{category}</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {products.map((product) => (
                                    <article
                                        key={product.name}
                                        className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
                                    >
                                        {product.imageUrl && (
                                            <div className="relative aspect-video w-full bg-zinc-100 overflow-hidden border-b border-zinc-100">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain p-4 mix-blend-multiply"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                        <div className="flex flex-1 flex-col p-5">
                                            <h4 className="mb-2 font-semibold leading-snug text-zinc-900">{product.name}</h4>

                                            <div className="space-y-3 mb-6 flex-1 text-sm text-zinc-600">
                                                <p>
                                                    <strong className="text-zinc-900 font-medium">Best for:</strong> {product.bestFor}
                                                </p>
                                                <p>{product.why}</p>
                                                {product.caution && (
                                                    <p className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-800 border border-orange-100">
                                                        <strong>Note:</strong> {product.caution}
                                                    </p>
                                                )}
                                            </div>

                                            <a
                                                href={product.url}
                                                target="_blank"
                                                rel="nofollow sponsored noopener noreferrer"
                                                className="mt-auto block w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                                            >
                                                View on Amazon
                                            </a>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>
        </div>
    );
}
