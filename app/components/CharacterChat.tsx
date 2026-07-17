'use client'

import { useEffect, useRef, useState } from "react";
import { GripVertical, Send, Image as ImageIcon, X, Bot, User, Minus, ChevronUp, AlertCircle, Wand2, Plus, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Position } from "@lib/types";
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

interface GenerateImageApiResponse {
    imageUrl: string;
    text: string | null;
}

export interface CharacterChatProps {
    id?: string;
    characterName?: string;
    characterContext?: Record<string, string>;
    initialPosition?: Position;
    initialMessages?: ChatMessage[];
    isMinimized?: boolean;
    zIndex?: number;
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
    const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
    const [isImageMode, setIsImageMode] = useState<boolean>(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
    const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
    const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
    const [typedLength, setTypedLength] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [position, setPosition] = useState<Position>(initialPosition);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragOffset = useRef<Position>({ x: 0, y: 0 });
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const toolsMenuRef = useRef<HTMLDivElement | null>(null);
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

    useEffect(() => {
        if (!isToolsMenuOpen) return;

        function handleClickOutside(e: MouseEvent): void {
            if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
                setIsToolsMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isToolsMenuOpen]);

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

    async function generateImageFlow(promptText: string, userMessageLabel: string): Promise<void> {
        const userMessage: ChatMessage = {
            id: createMessageId(),
            role: "user",
            content: userMessageLabel,
        };

        const messagesWithUser = [...messages, userMessage];
        setMessages(messagesWithUser);
        onMessagesChange?.(messagesWithUser);

        setDraft("");
        setIsGeneratingImage(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: promptText, characterContext }),
            });

            if (!response.ok) {
                throw new Error(`Geração de imagem respondeu ${response.status}`);
            }

            const data: GenerateImageApiResponse = await response.json();

            const assistantMessage: ChatMessage = {
                id: createMessageId(),
                role: "assistant",
                content: data.text ?? "",
                imageUrl: data.imageUrl,
            };

            setMessages((prev) => {
                const next = [...prev, assistantMessage];
                onMessagesChange?.(next);
                return next;
            });

            if (assistantMessage.content) startTypewriter(assistantMessage.id, assistantMessage.content);
        } catch (err) {
            setError("Não foi possível gerar a imagem agora. Tente de novo.");
        } finally {
            setIsGeneratingImage(false);
            startCooldown();
        }
    }

    async function handleSend(): Promise<void> {
        if (isLoading || isGeneratingImage || cooldownSeconds > 0 || typingMessageId) return;
        if (!draft.trim() && !attachedImage) return;

        const messageText = draft.trim();

        if (!attachedImage && isImageMode) {
            await generateImageFlow(messageText, messageText);
            return;
        }

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

    async function handleGenerateImage(): Promise<void> {
        if (isLoading || isGeneratingImage || cooldownSeconds > 0 || typingMessageId) return;
        if (!draft.trim() && !characterContext) return;

        const promptText = draft.trim();
        const label = promptText ? `Gerar imagem: ${promptText}` : "Gerar imagem com base no checklist";
        await generateImageFlow(promptText, label);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                zIndex,
                minWidth: 340,
                maxWidth: 720,
                minHeight: 320,
                maxHeight: 820,
            }}
            onMouseDownCapture={onFocus}
            className={`absolute left-0 top-0 flex h-[560px] w-[448px] resize flex-col overflow-hidden bg-stone-900 shadow-2xl ${isDragging ? "cursor-grabbing" : ""}`}
        >
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
                    <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
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

                        {isGeneratingImage && (
                            <div className="flex items-center gap-2 text-sm text-stone-500">
                                <Wand2 size={14} className="animate-pulse" />
                                Gerando imagem...
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
                                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-stone-300 hover:bg-red-600 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-1.5">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />

                            <div ref={toolsMenuRef} className="relative shrink-0">
                                {isToolsMenuOpen && (
                                    <div className="absolute bottom-full left-0 mb-1.5 w-52 rounded-sm border border-stone-700 bg-stone-800 py-1 shadow-2xl">
                                        <button
                                            onClick={() => {
                                                fileInputRef.current?.click();
                                                setIsToolsMenuOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-300 hover:bg-stone-700"
                                        >
                                            <ImageIcon size={13} />
                                            Anexar imagem
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleGenerateImage();
                                                setIsToolsMenuOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-300 hover:bg-stone-700"
                                        >
                                            <Wand2 size={13} />
                                            Gerar imagem agora
                                        </button>
                                        <button
                                            onClick={() => setIsImageMode((prev) => !prev)}
                                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-stone-300 hover:bg-stone-700"
                                        >
                                            <span className="flex items-center gap-2">
                                                <Sparkles size={13} />
                                                Modo imagem
                                            </span>
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${isImageMode ? "bg-violet-400" : "bg-stone-600"}`}
                                            />
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsToolsMenuOpen((prev) => !prev)}
                                    disabled={isLoading || isGeneratingImage || cooldownSeconds > 0 || Boolean(typingMessageId)}
                                    title="Ferramentas"
                                    className={`flex h-8 w-8 items-center justify-center rounded-sm border transition disabled:opacity-50 ${isImageMode
                                            ? "border-violet-500 bg-violet-600/20 text-violet-300"
                                            : "border-stone-700 text-stone-400 hover:border-violet-500 hover:text-violet-300"
                                        }`}
                                >
                                    <Plus size={15} />
                                </button>
                            </div>

                            <textarea
                                ref={textareaRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ex: combina uma jaqueta de couro com esse tema?"
                                rows={1}
                                disabled={isLoading || isGeneratingImage || cooldownSeconds > 0 || Boolean(typingMessageId)}
                                style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
                                className="custom-scrollbar flex-1 resize-none overflow-y-auto rounded-sm border border-stone-700 bg-stone-800 px-2.5 py-1.5 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-violet-500 disabled:opacity-50"
                            />

                            <button
                                onClick={handleSend}
                                disabled={isLoading || isGeneratingImage || cooldownSeconds > 0 || Boolean(typingMessageId)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-violet-600 bg-violet-600/10 text-violet-300 transition hover:bg-violet-600/20 disabled:opacity-50"
                            >
                                {cooldownSeconds > 0 ? (
                                    <span className="text-[10px] font-medium">{cooldownSeconds}</span>
                                ) : (
                                    <Send size={14} />
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}