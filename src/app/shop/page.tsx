import Link from "next/link";
import { NavigationTabBar } from "../components/NavigationTabBar";
import { shopProducts, ShopProduct } from "@/lib/shop-products";
import { Target, ShoppingBag, ExternalLink } from "lucide-react";

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
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur-md shadow-sm">
                <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Link 
                            href="/" 
                            className="flex items-center gap-2 text-xl font-serif font-bold tracking-tight text-forest hover:text-forest-light transition-colors"
                        >
                            <Target className="h-6 w-6 text-terracotta" />
                            ArrowLog
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
                <NavigationTabBar />

                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm mb-8">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-forest/10 rounded-lg">
                            <ShoppingBag className="h-5 w-5 text-forest" />
                        </div>
                        <div>
                            <h2 className="text-lg font-serif font-semibold text-stone-800 mb-1">Recommended Gear</h2>
                            <p className="text-sm text-stone-500 leading-relaxed">
                                As an Amazon Associate, I earn from qualifying purchases. I only share items I would personally recommend to developing archers.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    {Array.from(shopByCategory.entries()).map(([category, products]) => (
                        <section key={category}>
                            <h3 className="mb-4 text-lg font-serif font-bold text-stone-800 border-b border-stone-200 pb-2">
                                {category}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {products.map((product) => (
                                    <article
                                        key={product.name}
                                        className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:border-forest hover:shadow-md group"
                                    >
                                        {product.imageUrl && (
                                            <div className="relative aspect-video w-full bg-stone-100 overflow-hidden border-b border-stone-100">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                        <div className="flex flex-1 flex-col p-5">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-semibold leading-snug text-stone-800">{product.name}</h4>
                                                <span className="shrink-0 text-xs font-medium px-2 py-1 bg-stone-100 rounded-full text-stone-600">
                                                    {product.priceTier}
                                                </span>
                                            </div>

                                            <div className="space-y-3 mb-6 flex-1 text-sm text-stone-600">
                                                <p>
                                                    <strong className="text-stone-800 font-medium">Best for:</strong> {product.bestFor}
                                                </p>
                                                <p className="text-stone-500">{product.why}</p>
                                                {product.caution && (
                                                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-100">
                                                        <strong>Note:</strong> {product.caution}
                                                    </p>
                                                )}
                                            </div>

                                            <a
                                                href={product.url}
                                                target="_blank"
                                                rel="nofollow sponsored noopener noreferrer"
                                                className="mt-auto flex items-center justify-center gap-2 w-full rounded-lg bg-forest px-4 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-forest-dark"
                                            >
                                                <ExternalLink className="h-4 w-4" />
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
