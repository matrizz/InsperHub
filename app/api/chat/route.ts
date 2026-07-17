import { NextRequest, NextResponse } from "next/server";

interface ChatHistoryEntry {
    role: "user" | "assistant";
    content: string;
}

interface ChatRequestBody {
    message: string;
    imageBase64?: string;
    imageMimeType?: string;
    history?: ChatHistoryEntry[];
    characterContext?: Record<string, string>;
}

interface GeminiPart {
    text?: string;
    inline_data?: { mime_type: string; data: string };
}

interface GeminiContent {
    role: "user" | "model";
    parts: GeminiPart[];
}

interface GeminiGenerateContentResponse {
    candidates?: {
        content?: {
            parts?: { text?: string }[];
        };
    }[];
}

const CONTEXT_LABELS: Record<string, string> = {
    name: "Nome",
    age: "Idade",
    nationality: "Nacionalidade",
    personality: "Personalidade",
    height: "Altura",
    style: "Estilo/Estilo de roupa",
};

function buildSystemPrompt(characterContext?: Record<string, string>): string {
    const basePrompt =
        "Você é um assistente de referência visual para artistas digitais. Ajude com sugestões de paleta de cores, roupas, acessórios, penteados e outros elementos visuais que combinem com o personagem descrito. Responda sempre em português brasileiro, de forma direta e prática.";

    if (!characterContext) return basePrompt;

    const contextLines = Object.entries(characterContext)
        .filter(([, value]) => value && value.trim().length > 0)
        .map(([key, value]) => `${CONTEXT_LABELS[key] ?? key}: ${value}`);

    if (contextLines.length === 0) return basePrompt;

    return `${basePrompt}\n\nContexto do personagem:\n${contextLines.join("\n")}`;
}

async function parseJsonSafely<T>(response: Response, sourceName: string): Promise<T | null> {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        console.error(`${sourceName} retornou conteúdo não-JSON (content-type: ${contentType})`);
        return null;
    }

    try {
        return (await response.json()) as T;
    } catch (err) {
        console.error(`${sourceName} retornou JSON inválido`, err);
        return null;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

    if (!apiKey) {
        return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });
    }

    let body: ChatRequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
    }

    if (!body.message?.trim() && !body.imageBase64) {
        return NextResponse.json({ error: "Envie uma mensagem ou uma imagem" }, { status: 400 });
    }

    const history: GeminiContent[] = (body.history ?? []).map((entry) => ({
        role: entry.role === "assistant" ? "model" : "user",
        parts: [{ text: entry.content }],
    }));

    const currentParts: GeminiPart[] = [];
    if (body.message?.trim()) currentParts.push({ text: body.message.trim() });
    if (body.imageBase64 && body.imageMimeType) {
        currentParts.push({ inline_data: { mime_type: body.imageMimeType, data: body.imageBase64 } });
    }

    const contents: GeminiContent[] = [...history, { role: "user", parts: currentParts }];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: buildSystemPrompt(body.characterContext) }] },
            contents,
        }),
    });

    if (!response.ok) {
        console.error(`Gemini respondeu ${response.status}`);
        return NextResponse.json({ error: "Falha ao consultar a IA" }, { status: 502 });
    }

    const data = await parseJsonSafely<GeminiGenerateContentResponse>(response, "Gemini");
    if (!data) {
        return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 502 });
    }

    const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

    if (!reply) {
        return NextResponse.json({ error: "A IA não retornou nenhuma resposta" }, { status: 502 });
    }

    return NextResponse.json({ reply });
}