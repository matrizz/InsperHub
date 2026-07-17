'use client'

import { useEffect, useRef, useState } from "react";
import { LayoutPanelTop, ClipboardList, MessageSquare, Search, Image as ImageIcon } from "lucide-react";
import CharacterChecklist, { ChecklistPayload } from "./CharacterChecklist";
import CharacterChat, { ChatMessage } from "./CharacterChat";
import ReferenceSearch, { SearchResult } from "./ReferenceSearch";
import MoodboardPanel from "./MoodboardPanel";
import type { Position } from "@lib/types";
import { readFromStorage, writeToStorage } from "@lib/storage";

const PANEL_POSITIONS_STORAGE_KEY = "moodboard:panel-positions";
const MOODBOARD_ITEMS_STORAGE_KEY = "moodboard:saved-items";

type PanelId = "checklist" | "chat" | "search" | "moodboard";
type PanelVisibility = "open" | "minimized" | "closed";

const DEFAULT_LAYOUT: Record<PanelId, Position> = {
    checklist: { x: 40, y: 100 },
    search: { x: 480, y: 40 },
    chat: { x: 40, y: 580 },
    moodboard: { x: 900, y: 100 },
};

const PANEL_LABELS: Record<PanelId, string> = {
    checklist: "Checklist do Personagem",
    search: "Referências",
    chat: "Chat com IA",
    moodboard: "Moodboard",
};

const PANEL_ICONS: Record<PanelId, typeof ClipboardList> = {
    checklist: ClipboardList,
    search: Search,
    chat: MessageSquare,
    moodboard: ImageIcon,
};

const BASE_PANEL_Z_INDEX = 20;

interface MoodboardCanvasProps {
    characterName?: string;
    initialChatMessages?: ChatMessage[];
    onSaveChecklist?: (payload: ChecklistPayload) => void;
    onMessagesChange?: (messages: ChatMessage[]) => void;
    onSuggestKeywords?: (query: string) => Promise<string[]>;
    onSuggestFromChecklist?: (context: Record<string, string>) => Promise<string[]>;
    onAddToMoodboard?: (result: SearchResult) => void;
    onLayoutChange?: (positions: Record<PanelId, Position>) => void;
}

export default function MoodboardCanvas({
    characterName = "Personagem",
    initialChatMessages = [],
    onSaveChecklist,
    onMessagesChange,
    onSuggestKeywords,
    onSuggestFromChecklist,
    onAddToMoodboard,
    onLayoutChange,
}: MoodboardCanvasProps) {
    const [positions, setPositions] = useState<Record<PanelId, Position>>(DEFAULT_LAYOUT);
    const [isLayoutLoaded, setIsLayoutLoaded] = useState<boolean>(false);
    const [characterContext, setCharacterContext] = useState<ChecklistPayload>({});
    const [moodboardItems, setMoodboardItems] = useState<SearchResult[]>([]);
    const [visibility, setVisibility] = useState<Record<PanelId, PanelVisibility>>({
        checklist: "open",
        search: "open",
        chat: "open",
        moodboard: "open",
    });
    const [zIndices, setZIndices] = useState<Record<PanelId, number>>({
        checklist: BASE_PANEL_Z_INDEX,
        search: BASE_PANEL_Z_INDEX,
        chat: BASE_PANEL_Z_INDEX,
        moodboard: BASE_PANEL_Z_INDEX,
    });
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const zCounter = useRef<number>(BASE_PANEL_Z_INDEX);

    useEffect(() => {
        const persisted = readFromStorage<Record<PanelId, Position> | null>(PANEL_POSITIONS_STORAGE_KEY, null);
        if (persisted) setPositions(persisted);
        setIsLayoutLoaded(true);
    }, []);

    useEffect(() => {
        const persisted = readFromStorage<SearchResult[] | null>(MOODBOARD_ITEMS_STORAGE_KEY, null);
        if (persisted) setMoodboardItems(persisted);
    }, []);

    function bringToFront(panelId: PanelId): void {
        zCounter.current += 1;
        setZIndices((prev) => ({ ...prev, [panelId]: zCounter.current }));
    }

    function handleSaveChecklist(payload: ChecklistPayload): void {
        setCharacterContext(payload);
        onSaveChecklist?.(payload);
    }

    function handleAddToMoodboard(result: SearchResult): void {
        setMoodboardItems((prev) => {
            if (prev.some((item) => item.id === result.id)) return prev;
            const next = [...prev, result];
            writeToStorage(MOODBOARD_ITEMS_STORAGE_KEY, next);
            return next;
        });
        onAddToMoodboard?.(result);
    }

    function handleRemoveFromMoodboard(resultId: string): void {
        setMoodboardItems((prev) => {
            const next = prev.filter((item) => item.id !== resultId);
            writeToStorage(MOODBOARD_ITEMS_STORAGE_KEY, next);
            return next;
        });
    }

    function handlePositionChange(panelId: string, position: Position): void {
        setPositions((prev) => {
            const next = { ...prev, [panelId as PanelId]: position };
            writeToStorage(PANEL_POSITIONS_STORAGE_KEY, next);
            if (onLayoutChange) onLayoutChange(next);
            return next;
        });
    }

    function toggleMinimize(panelId: PanelId): void {
        setVisibility((prev) => ({
            ...prev,
            [panelId]: prev[panelId] === "minimized" ? "open" : "minimized",
        }));
    }

    function closePanel(panelId: PanelId): void {
        setVisibility((prev) => ({ ...prev, [panelId]: "closed" }));
    }

    function restorePanel(panelId: PanelId): void {
        setVisibility((prev) => ({ ...prev, [panelId]: "open" }));
        setIsMenuOpen(false);
    }

    const panelIds: PanelId[] = ["checklist", "search", "chat", "moodboard"];
    const hiddenPanelIds = panelIds.filter((panelId) => visibility[panelId] !== "open");

    return (
        <div className="custom-scrollbar relative min-h-screen w-full overflow-auto bg-stone-950 bg-[radial-gradient(circle,_theme(colors.stone.800)_1px,_transparent_1px)] bg-[length:24px_24px]">
            <div className="relative min-h-[1400px] min-w-[1400px] p-10">
                <div className="absolute left-6 top-6 z-10">
                    <button
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        aria-label="Painéis"
                        className="relative flex h-8 w-8 items-center justify-center rounded-sm border border-stone-700 bg-stone-900 text-stone-300 shadow-lg transition hover:border-violet-500 hover:text-violet-300"
                    >
                        <LayoutPanelTop size={14} />
                        {hiddenPanelIds.length > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-600 text-[9px] text-white">
                                {hiddenPanelIds.length}
                            </span>
                        )}
                    </button>

                    {isMenuOpen && (
                        <div className="mt-2 w-64 rounded-sm border border-stone-700 bg-stone-900 p-2 shadow-2xl">
                            {panelIds.map((panelId) => {
                                const Icon = PANEL_ICONS[panelId];
                                const status = visibility[panelId];
                                return (
                                    <div
                                        key={panelId}
                                        className="flex items-center justify-between gap-2 rounded-sm px-2 py-2 hover:bg-stone-800"
                                    >
                                        <div className="flex items-center gap-2 text-sm text-stone-300">
                                            <Icon size={14} className="text-stone-500" />
                                            {PANEL_LABELS[panelId]}
                                        </div>
                                        {status === "open" ? (
                                            <span className="text-[10px] text-stone-500">Aberto</span>
                                        ) : (
                                            <button
                                                onClick={() => restorePanel(panelId)}
                                                className="rounded-sm border border-violet-600 bg-violet-600/10 px-2 py-0.5 text-[10px] text-violet-300 transition hover:bg-violet-600/20"
                                            >
                                                {status === "minimized" ? "Expandir" : "Restaurar"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="absolute inset-x-10 top-6">
                    <p className="text-xs uppercase tracking-widest text-violet-400">Moodboard</p>
                    <h1 className="font-serif text-2xl text-amber-50">{characterName}</h1>
                </div>

                {isLayoutLoaded && visibility.checklist !== "closed" && (
                    <CharacterChecklist
                        id="checklist"
                        initialPosition={positions.checklist}
                        isMinimized={visibility.checklist === "minimized"}
                        zIndex={zIndices.checklist}
                        onPositionChange={handlePositionChange}
                        onFocus={() => bringToFront("checklist")}
                        onMinimize={() => toggleMinimize("checklist")}
                        onClose={() => closePanel("checklist")}
                        onSave={handleSaveChecklist}
                        onFieldsChange={setCharacterContext}
                    />
                )}

                {isLayoutLoaded && visibility.search !== "closed" && (
                    <ReferenceSearch
                        id="search"
                        initialPosition={positions.search}
                        isMinimized={visibility.search === "minimized"}
                        zIndex={zIndices.search}
                        onPositionChange={handlePositionChange}
                        onFocus={() => bringToFront("search")}
                        onMinimize={() => toggleMinimize("search")}
                        onClose={() => closePanel("search")}
                        onSuggestKeywords={onSuggestKeywords}
                        onSuggestFromChecklist={onSuggestFromChecklist}
                        characterContext={characterContext}
                        onAddToMoodboard={handleAddToMoodboard}
                    />
                )}

                {isLayoutLoaded && visibility.moodboard !== "closed" && (
                    <MoodboardPanel
                        id="moodboard"
                        initialPosition={positions.moodboard}
                        isMinimized={visibility.moodboard === "minimized"}
                        zIndex={zIndices.moodboard}
                        items={moodboardItems}
                        onPositionChange={handlePositionChange}
                        onFocus={() => bringToFront("moodboard")}
                        onMinimize={() => toggleMinimize("moodboard")}
                        onClose={() => closePanel("moodboard")}
                        onAddItem={handleAddToMoodboard}
                        onRemoveItem={handleRemoveFromMoodboard}
                    />
                )}

                {isLayoutLoaded && visibility.chat !== "closed" && (
                    <CharacterChat
                        id="chat"
                        characterName={characterName}
                        characterContext={characterContext}
                        initialPosition={positions.chat}
                        initialMessages={initialChatMessages}
                        isMinimized={visibility.chat === "minimized"}
                        zIndex={zIndices.chat}
                        onPositionChange={handlePositionChange}
                        onFocus={() => bringToFront("chat")}
                        onMinimize={() => toggleMinimize("chat")}
                        onClose={() => closePanel("chat")}
                        onMessagesChange={onMessagesChange}
                    />
                )}
            </div>
        </div>
    );
}