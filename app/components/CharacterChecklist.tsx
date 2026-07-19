'use client'

import { useEffect, useRef, useState } from "react";
import { GripVertical, Plus, Trash2, Save, Minus, ChevronUp, X } from "lucide-react";
import type { Position } from "@lib/types";
import { useIsTouchDevice } from "./UseIsTouchDevice";
import { readFromStorage, writeToStorage } from "@lib/storage";

type FieldType = "text" | "textarea";

export interface ChecklistField {
    id: string;
    label: string;
    value: string;
    type: FieldType;
    placeholder: string;
}

export type ChecklistPayload = Record<string, string>;

export interface CharacterChecklistProps {
    id?: string;
    initialPosition?: Position;
    isMinimized?: boolean;
    zIndex?: number;
    embedded?: boolean;
    onPositionChange?: (id: string, position: Position) => void;
    onFocus?: () => void;
    onMinimize?: () => void;
    onClose?: () => void;
    onSave?: (payload: ChecklistPayload) => void;
    onFieldsChange?: (payload: ChecklistPayload) => void;
}

const DEFAULT_FIELDS: ChecklistField[] = [
    { id: "name", label: "Nome do Personagem", value: "", type: "text", placeholder: "Ex: Kaelen Vosstra" },
    { id: "age", label: "Idade", value: "", type: "text", placeholder: "Ex: 27 anos" },
    { id: "nationality", label: "Nacionalidade", value: "", type: "text", placeholder: "Ex: Escandinava" },
    { id: "personality", label: "Personalidade", value: "", type: "textarea", placeholder: "Ex: Reservado, observador, leal aos poucos que confia" },
    { id: "height", label: "Altura", value: "", type: "text", placeholder: "Ex: 1.85m" },
    { id: "style", label: "Estilo/Estilo de Roupa", value: "", type: "textarea", placeholder: "Ex: Gótico industrial, tecidos pesados, metais foscos" },
];

function createField(): ChecklistField {
    return {
        id: `custom-${Date.now()}`,
        label: "",
        value: "",
        type: "text",
        placeholder: "Ex: Arma favorita",
    };
}

export default function CharacterChecklist({
    id = "character-checklist",
    initialPosition = { x: 0, y: 0 },
    isMinimized = false,
    zIndex,
    embedded = false,
    onPositionChange,
    onFocus,
    onMinimize,
    onClose,
    onSave,
    onFieldsChange,
}: CharacterChecklistProps) {
    const [fields, setFields] = useState<ChecklistField[]>(DEFAULT_FIELDS);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [savedFlash, setSavedFlash] = useState<boolean>(false);
    const [position, setPosition] = useState<Position>(initialPosition);
    const isTouchDevice = useIsTouchDevice();
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragOffset = useRef<Position>({ x: 0, y: 0 });

    useEffect(() => {
        const persisted = readFromStorage<ChecklistField[] | null>(`checklist:${id}`, null);
        if (persisted && persisted.length > 0) setFields(persisted);
        setIsLoaded(true);
    }, [id]);

    useEffect(() => {
        if (!isLoaded) return;
        writeToStorage(`checklist:${id}`, fields);

        if (onFieldsChange) {
            const payload = fields.reduce((acc, f) => {
                acc[f.id] = f.value;
                return acc;
            }, {} as ChecklistPayload);
            onFieldsChange(payload);
        }
    }, [fields, id, isLoaded]);

    function updateValue(fieldId: string, value: string): void {
        setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, value } : f)));
    }

    function updateLabel(fieldId: string, label: string): void {
        setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, label } : f)));
    }

    function removeField(fieldId: string): void {
        setFields((prev) => prev.filter((f) => f.id !== fieldId));
    }

    function addField(): void {
        setFields((prev) => [...prev, createField()]);
    }

    function handleSave(): void {
        const payload: ChecklistPayload = fields.reduce((acc, f) => {
            acc[f.id] = f.value;
            return acc;
        }, {} as ChecklistPayload);
        if (onSave) onSave(payload);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
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

    return (
        <div
            style={
                embedded
                    ? undefined
                    : {
                        transform: `translate(${position.x}px, ${position.y}px)`,
                        zIndex,
                        minWidth: 320,
                        maxWidth: 640,
                        minHeight: isMinimized ? undefined : 220,
                        maxHeight: isMinimized ? undefined : 800,
                        height: isMinimized ? "auto" : undefined,
                    }
            }
            onMouseDownCapture={embedded ? undefined : onFocus}
            className={
                embedded
                    ? "flex w-full flex-col bg-stone-900"
                    : `absolute left-0 top-0 flex h-[560px] w-[448px] flex-col overflow-hidden bg-stone-900 shadow-2xl ${isMinimized ? "resize-none" : "resize"
                    } ${isDragging ? "cursor-grabbing" : ""}`
            }
        >
            {!embedded && (
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex shrink-0 cursor-grab items-center justify-between border-b border-stone-800 px-4 py-3 active:cursor-grabbing"
                >
                    <div className="flex items-center gap-2">
                        <GripVertical size={16} className="text-stone-500" />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-violet-400">Ficha de Referência</p>
                            <h1 className="font-serif text-lg text-amber-50">Checklist do Personagem</h1>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <button
                            onClick={handleSave}
                            className={`flex items-center gap-2 rounded-sm border border-violet-600 bg-violet-600/10 text-xs text-violet-300 transition hover:bg-violet-600/20 ${isTouchDevice ? "px-3 py-2" : "px-3 py-1.5"
                                }`}
                        >
                            <Save size={14} />
                            {savedFlash ? "Salvo!" : "Salvar"}
                        </button>
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

            {embedded && (
                <div className="flex shrink-0 items-center justify-between border-b border-stone-800 px-1 pb-3">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 rounded-sm border border-violet-600 bg-violet-600/10 px-3 py-2 text-xs text-violet-300 transition hover:bg-violet-600/20"
                    >
                        <Save size={14} />
                        {savedFlash ? "Salvo!" : "Salvar"}
                    </button>
                </div>
            )}

            {(embedded || !isMinimized) && (
                <div
                    className={`custom-scrollbar space-y-4 overflow-y-auto p-4 ${embedded ? "max-h-[70vh]" : "min-h-0 flex-1"
                        }`}
                >
                    {fields.map((field) => (
                        <div key={field.id} className="group relative bg-amber-50 p-3 shadow-md">
                            <div className="mb-2 flex items-center justify-between">
                                <input
                                    value={field.label}
                                    onChange={(e) => updateLabel(field.id, e.target.value)}
                                    className="w-full bg-transparent font-serif text-sm font-medium text-stone-700 outline-none placeholder:text-stone-400"
                                    placeholder="Nome do campo"
                                />
                                <button
                                    onClick={() => removeField(field.id)}
                                    className={`shrink-0 text-stone-400 transition hover:text-red-500 ${isTouchDevice ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        }`}
                                >
                                    <Trash2 size={isTouchDevice ? 18 : 14} />
                                </button>
                            </div>

                            {field.type === "textarea" ? (
                                <textarea
                                    value={field.value}
                                    onChange={(e) => updateValue(field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={3}
                                    className="w-full resize-none border-b border-dashed border-stone-300 bg-transparent pb-1 text-sm text-stone-800 outline-none placeholder:text-stone-400"
                                />
                            ) : (
                                <input
                                    value={field.value}
                                    onChange={(e) => updateValue(field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    className="w-full border-b border-dashed border-stone-300 bg-transparent pb-1 text-sm text-stone-800 outline-none placeholder:text-stone-400"
                                />
                            )}
                        </div>
                    ))}

                    <button
                        onClick={addField}
                        className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-stone-700 py-2.5 text-sm text-stone-400 transition hover:border-violet-500 hover:text-violet-300"
                    >
                        <Plus size={16} />
                        Adicionar campo
                    </button>
                </div>
            )}
        </div>
    );
}