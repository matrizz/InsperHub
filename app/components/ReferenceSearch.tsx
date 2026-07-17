'use client'

import { useEffect, useRef, useState } from "react";
import { GripVertical, Search, Sparkles, Plus, Loader2, AlertCircle, LogIn, Minus, ChevronUp, X } from "lucide-react";
import type { Position } from "@lib/types";

export type ImageSource = "deviantart" | "google" | "external";
type SearchableImageSource = Exclude<ImageSource, "external">;

export interface SearchResult {
    id: string;
    imageUrl: string;
    sourceUrl: string;
    source: ImageSource;
    author: string;
}

interface SearchApiResponse {
    results: SearchResult[];
    deviantArtAuthRequired: boolean;
    hasMore: boolean;
}

interface DeviantArtStatusResponse {
    connected: boolean;
}

export interface ReferenceSearchProps {
    id?: string;
    initialPosition?: Position;
    isMinimized?: boolean;
    zIndex?: number;
    characterContext?: Record<string, string>;
    onPositionChange?: (id: string, position: Position) => void;
    onFocus?: () => void;
    onMinimize?: () => void;
    onClose?: () => void;
    onSuggestKeywords?: (query: string) => Promise<string[]>;
    onSuggestFromChecklist?: (context: Record<string, string>) => Promise<string[]>;
    onAddToMoodboard?: (result: SearchResult) => void;
}

const SEARCHABLE_SOURCES: SearchableImageSource[] = ["deviantart", "google"];

const SOURCE_LABELS: Record<SearchableImageSource, string> = {
    deviantart: "DeviantArt (personagens/fan art)",
    google: "Google Imagens",
};

export default function ReferenceSearch({
    id = "reference-search",
    initialPosition = { x: 0, y: 0 },
    isMinimized = false,
    zIndex,
    characterContext,
    onPositionChange,
    onFocus,
    onMinimize,
    onClose,
    onSuggestKeywords,
    onSuggestFromChecklist,
    onAddToMoodboard,
}: ReferenceSearchProps) {
    const [query, setQuery] = useState<string>("");
    const [activeQuery, setActiveQuery] = useState<string>("");
    const [activeSources, setActiveSources] = useState<SearchableImageSource[]>(["deviantart", "google"]);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [page, setPage] = useState<number>(1);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [isSuggestingKeywords, setIsSuggestingKeywords] = useState<boolean>(false);
    const [isSuggestingFromChecklist, setIsSuggestingFromChecklist] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [needsDeviantArtAuth, setNeedsDeviantArtAuth] = useState<boolean>(false);
    const [position, setPosition] = useState<Position>(initialPosition);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragOffset = useRef<Position>({ x: 0, y: 0 });

    useEffect(() => {
        async function checkDeviantArtStatus(): Promise<void> {
            try {
                const response = await fetch("/api/auth/deviantart/status");
                if (!response.ok) return;
                const data: DeviantArtStatusResponse = await response.json();
                setNeedsDeviantArtAuth(!data.connected);
            } catch {
                setNeedsDeviantArtAuth(true);
            }
        }

        checkDeviantArtStatus();
    }, []);

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
        if (!isDragging) return;
        const next: Position = {
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y,
        };
        setPosition(next);
        if (onPositionChange) onPositionChange(id, next);
    }

    function handlePointerUp(e: React.PointerEvent<HTMLDivElement>): void {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }

    function toggleSource(source: SearchableImageSource): void {
        setActiveSources((prev) =>
            prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
        );
    }

    function connectDeviantArt(): void {
        window.location.href = "/api/auth/deviantart";
    }

    async function performSearch(searchQuery: string, targetPage: number): Promise<void> {
        if (!searchQuery.trim() || activeSources.length === 0) return;

        const isFirstPage = targetPage === 1;
        if (isFirstPage) {
            setIsLoading(true);
            setError(null);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const params = new URLSearchParams({
                query: searchQuery.trim(),
                sources: activeSources.join(","),
                page: String(targetPage),
            });

            const response = await fetch(`/api/search-images?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`Busca falhou com status ${response.status}`);
            }

            const data: SearchApiResponse = await response.json();

            setResults((prev) => {
                if (isFirstPage) return data.results;
                const existingIds = new Set(prev.map((r) => r.id));
                return [...prev, ...data.results.filter((r) => !existingIds.has(r.id))];
            });

            setHasMore(data.hasMore);
            setPage(targetPage);
            setActiveQuery(searchQuery.trim());
            setNeedsDeviantArtAuth(data.deviantArtAuthRequired);
        } catch (err) {
            if (isFirstPage) {
                setError("Não foi possível buscar as referências agora. Tente novamente.");
                setResults([]);
            }
        } finally {
            if (isFirstPage) setIsLoading(false);
            else setIsLoadingMore(false);
        }
    }

    function loadMore(): void {
        if (isLoading || isLoadingMore || !hasMore || !activeQuery) return;
        performSearch(activeQuery, page + 1);
    }

    function handleResultsScroll(e: React.UIEvent<HTMLDivElement>): void {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
            loadMore();
        }
    }

    async function handleSuggestKeywords(): Promise<void> {
        if (!onSuggestKeywords || !query.trim()) return;

        setIsSuggestingKeywords(true);
        try {
            const suggestions = await onSuggestKeywords(query.trim());
            if (suggestions.length > 0) {
                const suggestedQuery = suggestions.join(" ");
                setQuery(suggestedQuery);
                await performSearch(suggestedQuery, 1);
            }
        } finally {
            setIsSuggestingKeywords(false);
        }
    }

    async function handleSuggestFromChecklist(): Promise<void> {
        if (!onSuggestFromChecklist || !characterContext) return;

        setIsSuggestingFromChecklist(true);
        try {
            const suggestions = await onSuggestFromChecklist(characterContext);
            if (suggestions.length > 0) {
                const suggestedQuery = suggestions.join(" ");
                setQuery(suggestedQuery);
                await performSearch(suggestedQuery, 1);
            }
        } finally {
            setIsSuggestingFromChecklist(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
        if (e.key === "Enter") performSearch(query, 1);
    }

    return (
        <div
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                zIndex,
                minWidth: 360,
                maxWidth: 760,
                minHeight: 220,
                maxHeight: 800,
            }}
            onMouseDownCapture={onFocus}
            className={`absolute left-0 top-0 flex h-[560px] w-[512px] resize flex-col overflow-hidden bg-stone-900 shadow-2xl ${isDragging ? "cursor-grabbing" : ""}`}
        >
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="flex shrink-0 cursor-grab items-center gap-2 border-b border-stone-800 px-4 py-3 active:cursor-grabbing"
            >
                <GripVertical size={16} className="text-stone-500" />
                <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-violet-400">Buscador</p>
                    <h1 className="font-serif text-lg text-amber-50">Referências</h1>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {onMinimize && (
                        <button
                            onClick={onMinimize}
                            className="flex h-7 w-7 items-center justify-center rounded-sm text-stone-400 transition hover:bg-stone-800 hover:text-amber-50"
                        >
                            {isMinimized ? <ChevronUp size={14} /> : <Minus size={14} />}
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex h-7 w-7 items-center justify-center rounded-sm text-stone-400 transition hover:bg-red-600/20 hover:text-red-400"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {!isMinimized && (
                <>
                    <div className="shrink-0 space-y-3 border-b border-stone-800 p-4">
                        <div className="flex gap-2">
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ex: cyberpunk jacket neon"
                                className="flex-1 rounded-sm border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-violet-500"
                            />
                            <button
                                onClick={() => performSearch(query, 1)}
                                disabled={isLoading}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-violet-600 bg-violet-600/10 text-violet-300 transition hover:bg-violet-600/20 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                                {SEARCHABLE_SOURCES.map((source) => (
                                    <button
                                        key={source}
                                        onClick={() => toggleSource(source)}
                                        className={`rounded-sm border px-2.5 py-1 text-xs transition ${activeSources.includes(source)
                                                ? "border-violet-500 bg-violet-600/10 text-violet-300"
                                                : "border-stone-700 text-stone-500 hover:border-stone-600"
                                            }`}
                                    >
                                        {SOURCE_LABELS[source]}
                                    </button>
                                ))}
                            </div>

                            {onSuggestKeywords && (
                                <button
                                    onClick={handleSuggestKeywords}
                                    disabled={isSuggestingKeywords || !query.trim()}
                                    className="flex items-center gap-1.5 text-xs text-stone-400 transition hover:text-violet-300 disabled:opacity-50"
                                >
                                    {isSuggestingKeywords ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                    Sugerir palavras-chave
                                </button>
                            )}

                            {onSuggestFromChecklist && (
                                <button
                                    onClick={handleSuggestFromChecklist}
                                    disabled={isSuggestingFromChecklist || !characterContext}
                                    className="flex items-center gap-1.5 text-xs text-stone-400 transition hover:text-violet-300 disabled:opacity-50"
                                >
                                    {isSuggestingFromChecklist ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={13} />
                                    )}
                                    Sugerir tags/pesquisa
                                </button>
                            )}
                        </div>

                        {needsDeviantArtAuth && activeSources.includes("deviantart") && (
                            <button
                                onClick={connectDeviantArt}
                                className="flex w-full items-center justify-center gap-2 rounded-sm border border-violet-600 bg-violet-600/10 py-2 text-xs text-violet-300 transition hover:bg-violet-600/20"
                            >
                                <LogIn size={13} />
                                Conectar conta DeviantArt pra buscar personagens/fan art
                            </button>
                        )}
                    </div>

                    <div
                        onScroll={handleResultsScroll}
                        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
                    >
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {isLoading && (
                                <div className="col-span-full flex items-center justify-center gap-2 py-8 text-sm text-stone-500">
                                    <Loader2 size={14} className="animate-spin" />
                                    Buscando referências...
                                </div>
                            )}

                            {!isLoading && error && (
                                <div className="col-span-full flex items-center justify-center gap-2 py-8 text-sm text-red-400">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            {!isLoading && !error && results.length === 0 && (
                                <p className="col-span-full py-8 text-center text-sm text-stone-500">
                                    Nenhuma referência ainda. Faça uma busca acima.
                                </p>
                            )}

                            {!isLoading &&
                                !error &&
                                results.map((result) => (
                                    <div key={result.id} className="group relative overflow-hidden bg-stone-800">
                                        <img
                                            src={result.imageUrl}
                                            alt={`Referência de ${result.author}`}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData("application/json", JSON.stringify(result));
                                                e.dataTransfer.effectAllowed = "copy";
                                            }}
                                            className="h-32 w-full cursor-grab object-cover active:cursor-grabbing"
                                        />
                                        <div className="absolute inset-0 flex items-end justify-between bg-stone-950/0 p-1.5 opacity-0 transition group-hover:bg-stone-950/50 group-hover:opacity-100">
                                            <span className="truncate text-[10px] text-stone-200">{result.author}</span>
                                            <button
                                                onClick={() => onAddToMoodboard?.(result)}
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-violet-600 text-white hover:bg-violet-500"
                                            >
                                                <Plus size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            {isLoadingMore && (
                                <div className="col-span-full flex items-center justify-center gap-2 py-4 text-xs text-stone-500">
                                    <Loader2 size={13} className="animate-spin" />
                                    Carregando mais...
                                </div>
                            )}

                            {!isLoading && !isLoadingMore && !hasMore && results.length > 0 && (
                                <p className="col-span-full py-3 text-center text-[11px] text-stone-600">
                                    Não há mais referências pra essa busca
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}