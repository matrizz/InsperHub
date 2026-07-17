import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, X, Minus, ChevronUp, ImageOff } from "lucide-react";
import type { Position } from "@lib/types";
import type { SearchResult } from "./ReferenceSearch";

export interface MoodboardPanelProps {
    id?: string;
    initialPosition?: Position;
    isMinimized?: boolean;
    zIndex?: number;
    items: SearchResult[];
    onPositionChange?: (id: string, position: Position) => void;
    onFocus?: () => void;
    onMinimize?: () => void;
    onClose?: () => void;
    onAddItem?: (result: SearchResult) => void;
    onRemoveItem?: (resultId: string) => void;
}

function createExternalId(): string {
    return `external-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
        reader.readAsDataURL(file);
    });
}

export default function MoodboardPanel({
    id = "moodboard-panel",
    initialPosition = { x: 0, y: 0 },
    isMinimized = false,
    zIndex,
    items,
    onPositionChange,
    onFocus,
    onMinimize,
    onClose,
    onAddItem,
    onRemoveItem,
}: MoodboardPanelProps) {
    const [position, setPosition] = useState<Position>(initialPosition);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isDropTarget, setIsDropTarget] = useState<boolean>(false);
    const [fullscreenItem, setFullscreenItem] = useState<SearchResult | null>(null);
    const dragOffset = useRef<Position>({ x: 0, y: 0 });

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

    function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
        e.preventDefault();
        setIsDropTarget(true);
    }

    function handleDragLeave(): void {
        setIsDropTarget(false);
    }

    async function handleDrop(e: React.DragEvent<HTMLDivElement>): Promise<void> {
        e.preventDefault();
        setIsDropTarget(false);

        const jsonData = e.dataTransfer.getData("application/json");
        if (jsonData) {
            try {
                const result: SearchResult = JSON.parse(jsonData);
                onAddItem?.(result);
                return;
            } catch {
                // não era um SearchResult válido, tenta os outros formatos abaixo
            }
        }

        const uriData = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
        if (uriData && /^https?:\/\//.test(uriData.trim())) {
            const url = uriData.trim();
            onAddItem?.({ id: createExternalId(), imageUrl: url, sourceUrl: url, source: "external", author: "Externo" });
            return;
        }

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const dataUrl = await fileToDataUrl(file);
            onAddItem?.({
                id: createExternalId(),
                imageUrl: dataUrl,
                sourceUrl: dataUrl,
                source: "external",
                author: "Upload local",
            });
        }
    }

    return (
        <>
            <div
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    zIndex,
                    minWidth: 360,
                    maxWidth: 900,
                    minHeight: 240,
                    maxHeight: 900,
                }}
                onMouseDownCapture={onFocus}
                className={`absolute left-0 top-0 flex h-[480px] w-[560px] resize flex-col overflow-hidden bg-stone-900 shadow-2xl ${isDragging ? "cursor-grabbing" : ""}`}
            >
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex shrink-0 cursor-grab items-center gap-2 border-b border-stone-800 px-4 py-3 active:cursor-grabbing"
                >
                    <GripVertical size={16} className="text-stone-500" />
                    <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-violet-400">Moodboard</p>
                        <h1 className="font-serif text-lg text-amber-50">Referências Salvas</h1>
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
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 transition ${isDropTarget ? "bg-violet-600/10 outline-dashed outline-2 outline-violet-500" : ""
                            }`}
                    >
                        {items.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-600">
                                <ImageOff size={22} />
                                <p className="text-sm">Arraste imagens até aqui, ou adicione pela busca</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {items.map((item) => (
                                    <div key={item.id} className="group relative overflow-hidden bg-stone-800">
                                        <img
                                            src={item.imageUrl}
                                            alt={`Referência de ${item.author}`}
                                            onClick={() => setFullscreenItem(item)}
                                            className="h-32 w-full cursor-zoom-in object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-start justify-end bg-stone-950/0 p-1.5 opacity-0 transition group-hover:bg-stone-950/40 group-hover:opacity-100">
                                            <button
                                                onClick={() => onRemoveItem?.(item.id)}
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-red-600 text-white hover:bg-red-500"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {fullscreenItem &&
                createPortal(
                    <div
                        onClick={() => setFullscreenItem(null)}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/90 p-8"
                    >
                        <button
                            onClick={() => setFullscreenItem(null)}
                            className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-300 hover:bg-red-600 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={fullscreenItem.imageUrl}
                            alt={`Referência de ${fullscreenItem.author}`}
                            onClick={(e) => e.stopPropagation()}
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>,
                    document.body
                )}
        </>
    );
}