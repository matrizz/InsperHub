'use client'

import { useEffect, useRef, useState } from "react";
import { GripVertical, Send, Image as ImageIcon, X, Bot, User, Minus, ChevronUp, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Position } from "@lib/types";
import { useIsTouchDevice } from "./UseIsTouchDevice";
import { readFromStorage, writeToStorage } from "@lib/storage";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
}

interface ChatApiResponse {
    reply: string;
}

export interface CharacterChatProps {
    id?: string;
    characterName?: string;
    characterContext?: Record<string, string>;
    initialPosition?: Position;
    initialMessages?: ChatMessage[];
    isMinimized?: boolean;
    zIndex?: number;
    embedded?: boolean;
    onPositionChange?: (id: string, position: Position) => void;
    onFocus?: () => void;
    onMinimize?: () => void;
    onClose?: () => void;
    onMessagesChange?: (messages: ChatMessage[]) => void;
}

const COOLDOWN_SECONDS = 5;
const TYPEWRITER_CHARS_PER_TICK = 3;
const TYPEWRITER_TICK_MS = 20;
const MAX_TEXTAREA_HEIGHT = 120;

function createMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
        reader.readAsDataURL(file);
    });
}

export default function CharacterChat({
    id = "character-chat",
    characterName = "Personagem",
    characterContext,
    initialPosition = { x: 0, y: 0 },
    initialMessages = [],
    isMinimized = false,
    zIndex,
    embedded = false,
    onPositionChange,
    onFocus,
    onMinimize,
    onClose,
    onMessagesChange,
}: CharacterChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [draft, setDraft] = useState<string>("");
    const [attachedImage, setAttachedImage] = useState<File | null>(null);
    const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
    const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
    const [typedLength, setTypedLength] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [position, setPosition] = useState<Position>(initialPosition);
    const isTouchDevice = useIsTouchDevice();
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragOffset = useRef<Position>({ x: 0, y: 0 });
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const persisted = readFromStorage<ChatMessage[] | null>(`chat:${id}`, null);
        if (persisted && persisted.length > 0) setMessages(persisted);
        setIsLoaded(true);
    }, [id]);

    useEffect(() => {
        if (!isLoaded) return;
        writeToStorage(`chat:${id}`, messages);
    }, [messages, id, isLoaded]);

    useEffect(() => {
        return () => {
            if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }, [draft]);

    function startTypewriter(messageId: string, fullText: string): void {
        setTypingMessageId(messageId);
        setTypedLength(0);
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = setInterval(() => {
            setTypedLength((prev) => {
                const next = prev + TYPEWRITER_CHARS_PER_TICK;
                if (next >= fullText.length) {
                    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
                    setTypingMessageId(null);
                    return fullText.length;
                }
                return next;
            });
        }, TYPEWRITER_TICK_MS);
    }

    function startCooldown(): void {
        setCooldownSeconds(COOLDOWN_SECONDS);
        if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = setInterval(() => {
            setCooldownSeconds((prev) => {
                if (prev <= 1) {
                    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

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

    function handleImagePick(e: React.ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0] ?? null;
        setAttachedImage(file);
        setAttachedPreview(file ? URL.createObjectURL(file) : null);
    }

    function clearAttachment(): void {
        setAttachedImage(null);
        setAttachedPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSend(): Promise<void> {
        if (isLoading || cooldownSeconds > 0 || typingMessageId) return;
        if (!draft.trim() && !attachedImage) return;

        const messageText = draft.trim();

        const userMessage: ChatMessage = {
            id: createMessageId(),
            role: "user",
            content: messageText,
            imageUrl: attachedPreview ?? undefined,
        };

        const historyForRequest = messages.map((message) => ({
            role: message.role,
            content: message.content,
        }));

        const imageFile = attachedImage;

        const messagesWithUser = [...messages, userMessage];
        setMessages(messagesWithUser);
        onMessagesChange?.(messagesWithUser);

        setDraft("");
        clearAttachment();
        setIsLoading(true);
        setError(null);

        try {
            let imageBase64: string | undefined;
            let imageMimeType: string | undefined;

            if (imageFile) {
                imageBase64 = await fileToBase64(imageFile);
                imageMimeType = imageFile.type;
            }

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageText,
                    imageBase64,
                    imageMimeType,
                    history: historyForRequest,
                    characterContext,
                }),
            });

            if (!response.ok) {
                throw new Error(`Chat respondeu ${response.status}`);
            }

            const data: ChatApiResponse = await response.json();

            const assistantMessage: ChatMessage = {
                id: createMessageId(),
                role: "assistant",
                content: data.reply,
            };

            setMessages((prev) => {
                const next = [...prev, assistantMessage];
                onMessagesChange?.(next);
                return next;
            });
            startTypewriter(assistantMessage.id, assistantMessage.content);
        } catch (err) {
            setError("Não foi possível falar com a IA agora. Tente de novo.");
        } finally {
            setIsLoading(false);
            startCooldown();
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div
            style={
                embedded
                    ? undefined
                    : {
                        transform: `translate(${position.x}px, ${position.y}px)`,
                        zIndex,
                        minWidth: 420,
                        maxWidth: 760,
                        minHeight: isMinimized ? undefined : 480,
                        maxHeight: isMinimized ? undefined : 860,
                        height: isMinimized ? "auto" : undefined,
                    }
            }
            onMouseDownCapture={embedded ? undefined : onFocus}
            className={
                embedded
                    ? "flex w-full flex-col bg-stone-900"
                    : `absolute left-0 top-0 flex h-[640px] w-[480px] flex-col overflow-hidden bg-stone-900 shadow-2xl ${isMinimized ? "resize-none" : "resize"
                    } ${isDragging ? "cursor-grabbing" : ""}`
            }
        >
            {!embedded && (
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex shrink-0 cursor-grab items-center gap-2 border-b border-stone-800 px-4 py-3 active:cursor-grabbing"
                >
                    <GripVertical size={16} className="text-stone-500" />
                    <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-violet-400">Chat com IA</p>
                        <h1 className="font-serif text-lg text-amber-50">{characterName}</h1>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {onMinimize && (
                            <button
                                onClick={onMinimize}
                                className={`flex items-center justify-center rounded-sm text-stone-400 transition hover:bg-stone-800 hover:text-amber-50 ${isTouchDevice ? "h-9 w-9" : "h-7 w-7"
                                    }`}
                            >
                                {isMinimized ? <ChevronUp size={14} /> : <Minus size={14} />}
                            </button>
                        )}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className={`flex items-center justify-center rounded-sm text-stone-400 transition hover:bg-red-600/20 hover:text-red-400 ${isTouchDevice ? "h-9 w-9" : "h-7 w-7"
                                    }`}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {(embedded || !isMinimized) && (
                <>
                    <div
                        className={`custom-scrollbar flex flex-col gap-3 overflow-y-auto p-4 ${embedded ? "max-h-[55vh]" : "min-h-0 flex-1"
                            }`}
                    >
                        {messages.length === 0 && (
                            <p className="m-auto text-center text-sm text-stone-500">
                                Pergunte sobre paletas, roupas ou acessórios para {characterName}.
                            </p>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex items-start gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                            >
                                <div
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${message.role === "user" ? "bg-violet-600/20 text-violet-300" : "bg-amber-50 text-stone-700"
                                        }`}
                                >
                                    {message.role === "user" ? <User size={14} /> : <Bot size={14} />}
                                </div>
                                <div
                                    className={`max-w-[75%] space-y-2 rounded-sm px-3 py-2 text-sm ${message.role === "user" ? "bg-violet-600/10 text-violet-100" : "bg-amber-50 text-stone-800"
                                        }`}
                                >
                                    {message.imageUrl && (
                                        <img src={message.imageUrl} alt="Referência enviada" className="max-h-40 rounded-sm object-cover" />
                                    )}
                                    {message.content && message.role === "assistant" ? (
                                        message.id === typingMessageId ? (
                                            <p className="whitespace-pre-wrap">
                                                {message.content.slice(0, typedLength)}
                                                <span className="animate-pulse">▍</span>
                                            </p>
                                        ) : (
                                            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-pre:my-1">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                                            </div>
                                        )
                                    ) : (
                                        message.content && <p className="whitespace-pre-wrap">{message.content}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-center gap-2 text-sm text-stone-500">
                                <Bot size={14} />
                                Pensando...
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-400">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-stone-800 p-3">
                        {cooldownSeconds > 0 && (
                            <p className="mb-2 text-[11px] text-stone-500">
                                Aguarde {cooldownSeconds}s antes de enviar de novo (limite de requisições do Gemini)
                            </p>
                        )}

                        {attachedPreview && (
                            <div className="relative mb-2 inline-block">
                                <img src={attachedPreview} alt="Anexo" className="h-16 w-16 rounded-sm object-cover" />
                                <button
                                    onClick={clearAttachment}
                                    className={`absolute -right-2 -top-2 flex items-center justify-center rounded-full bg-stone-800 text-stone-300 hover:bg-red-600 hover:text-white ${isTouchDevice ? "h-7 w-7" : "h-5 w-5"
                                        }`}
                                >
                                    <X size={isTouchDevice ? 14 : 12} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-1.5">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading || cooldownSeconds > 0 || Boolean(typingMessageId)}
                                className={`flex shrink-0 items-center justify-center rounded-sm border border-stone-700 text-stone-400 transition hover:border-violet-500 hover:text-violet-300 disabled:opacity-50 ${isTouchDevice ? "h-10 w-10" : "h-8 w-8"
                                    }`}
                            >
                                <ImageIcon size={isTouchDevice ? 17 : 15} />
                            </button>

                            <textarea
                                ref={textareaRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ex: combina uma jaqueta de couro com esse tema?"
                                rows={1}
                                disabled={isLoading || cooldownSeconds > 0 || Boolean(typingMessageId)}
                                style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
                                className={`custom-scrollbar flex-1 resize-none overflow-y-auto rounded-sm border border-stone-700 bg-stone-800 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-violet-500 disabled:opacity-50 ${isTouchDevice ? "px-3 py-2.5" : "px-2.5 py-1.5"
                                    }`}
                            />

                            <button
                                onClick={handleSend}
                                disabled={isLoading || cooldownSeconds > 0 || Boolean(typingMessageId)}
                                className={`flex shrink-0 items-center justify-center rounded-sm border border-violet-600 bg-violet-600/10 text-violet-300 transition hover:bg-violet-600/20 disabled:opacity-50 ${isTouchDevice ? "h-10 w-10" : "h-8 w-8"
                                    }`}
                            >
                                {cooldownSeconds > 0 ? (
                                    <span className="text-[10px] font-medium">{cooldownSeconds}</span>
                                ) : (
                                    <Send size={isTouchDevice ? 16 : 14} />
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}