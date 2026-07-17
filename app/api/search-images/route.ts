// app/api/search-images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type ImageSource = "deviantart" | "google";

interface SearchResult {
    id: string;
    imageUrl: string;
    sourceUrl: string;
    source: ImageSource;
    author: string;
}

interface SourceOutcome {
    results: SearchResult[];
    hasMore: boolean;
}

interface DeviantArtTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

interface DeviantArtDeviation {
    deviationid: string;
    title: string;
    url: string;
    author: { username: string };
    thumbs?: { src: string }[];
    content?: { src: string };
}

interface DeviantArtSearchResponse {
    results: DeviantArtDeviation[];
    has_more?: boolean;
}

interface DeviantArtSearchOutcome extends SourceOutcome {
    authRequired: boolean;
}

interface GoogleSearchItem {
    link: string;
    image: { contextLink: string };
    displayLink: string;
}

interface GoogleSearchResponse {
    items?: GoogleSearchItem[];
    searchInformation?: { totalResults?: string };
}

const RESULTS_PER_SOURCE = 12;
const GOOGLE_RESULTS_PER_PAGE = 10;
const GOOGLE_MAX_RESULTS = 100;

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

async function getValidDeviantArtToken(): Promise<string | null> {
    const cookieStore = await cookies();
    const existingAccessToken = cookieStore.get("da_access_token")?.value;
    if (existingAccessToken) return existingAccessToken;

    const refreshToken = cookieStore.get("da_refresh_token")?.value;
    if (!refreshToken) return null;

    const clientId = process.env.DEVIANTART_CLIENT_ID;
    const clientSecret = process.env.DEVIANTART_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const params = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
    });

    const response = await fetch("https://www.deviantart.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });

    if (!response.ok) {
        console.error(`DeviantArt (refresh de token) respondeu ${response.status}`);
        return null;
    }

    const data = await parseJsonSafely<DeviantArtTokenResponse>(response, "DeviantArt (refresh de token)");
    if (!data) return null;

    cookieStore.set("da_access_token", data.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: data.expires_in,
        path: "/",
    });
    cookieStore.set("da_refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
    });

    return data.access_token;
}

function extractTagCandidates(query: string): string[] {
    const words = query
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9]/g, ""))
        .filter((word) => word.length > 2);

    return Array.from(new Set(words)).slice(0, 3);
}

async function searchDeviantArtByTag(
    tag: string,
    token: string,
    offset: number
): Promise<{ deviations: DeviantArtDeviation[]; hasMore: boolean }> {
    const url = `https://www.deviantart.com/api/v1/oauth2/browse/tags?tag=${encodeURIComponent(
        tag
    )}&limit=${RESULTS_PER_SOURCE}&offset=${offset}&mature_content=false`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        console.error(`DeviantArt (tag "${tag}") respondeu ${response.status}`);
        return { deviations: [], hasMore: false };
    }

    const data = await parseJsonSafely<DeviantArtSearchResponse>(response, `DeviantArt (tag "${tag}")`);
    return { deviations: data?.results ?? [], hasMore: data?.has_more ?? false };
}

async function searchDeviantArt(query: string, page: number): Promise<DeviantArtSearchOutcome> {
    const token = await getValidDeviantArtToken();
    if (!token) return { results: [], hasMore: false, authRequired: true };

    const tags = extractTagCandidates(query);
    if (tags.length === 0) return { results: [], hasMore: false, authRequired: false };

    const offset = (page - 1) * RESULTS_PER_SOURCE;
    const tagResults = await Promise.all(tags.map((tag) => searchDeviantArtByTag(tag, token, offset)));

    const seen = new Set<string>();
    const deviations = tagResults
        .flatMap((tagResult) => tagResult.deviations)
        .filter((deviation) => {
            if (seen.has(deviation.deviationid)) return false;
            seen.add(deviation.deviationid);
            return true;
        });

    const results: SearchResult[] = deviations
        .filter((deviation) => Boolean(deviation.content?.src) || Boolean(deviation.thumbs?.[0]?.src))
        .map((deviation) => ({
            id: `deviantart-${deviation.deviationid}`,
            imageUrl: deviation.content?.src ?? (deviation.thumbs as { src: string }[])[0].src,
            sourceUrl: deviation.url,
            source: "deviantart" as const,
            author: deviation.author.username,
        }));

    const hasMore = tagResults.some((tagResult) => tagResult.hasMore);

    return { results, hasMore, authRequired: false };
}

async function searchGoogle(query: string, page: number): Promise<SourceOutcome> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
        console.error("GOOGLE_API_KEY/GOOGLE_SEARCH_ENGINE_ID não configuradas");
        return { results: [], hasMore: false };
    }

    const start = (page - 1) * GOOGLE_RESULTS_PER_PAGE + 1;
    if (start > GOOGLE_MAX_RESULTS) return { results: [], hasMore: false };

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
        query
    )}&searchType=image&num=${GOOGLE_RESULTS_PER_PAGE}&start=${start}`;

    const response = await fetch(url);

    if (!response.ok) {
        console.error(`Google respondeu ${response.status}`);
        return { results: [], hasMore: false };
    }

    const data = await parseJsonSafely<GoogleSearchResponse>(response, "Google");
    if (!data?.items) return { results: [], hasMore: false };

    const results: SearchResult[] = data.items.map((item, index) => ({
        id: `google-${start + index}-${item.link}`,
        imageUrl: item.link,
        sourceUrl: item.image.contextLink,
        source: "google" as const,
        author: item.displayLink,
    }));

    const totalResults = Number(data.searchInformation?.totalResults ?? "0");
    const hasMore = start + GOOGLE_RESULTS_PER_PAGE <= Math.min(totalResults, GOOGLE_MAX_RESULTS);

    return { results, hasMore };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const query = request.nextUrl.searchParams.get("query");
    const sourcesParam = request.nextUrl.searchParams.get("sources") ?? "deviantart,google";
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
    const sources = sourcesParam
        .split(",")
        .filter((s): s is ImageSource => s === "deviantart" || s === "google");

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ error: "Parâmetro 'query' é obrigatório" }, { status: 400 });
    }

    if (sources.length === 0) {
        return NextResponse.json({ results: [], deviantArtAuthRequired: false, hasMore: false });
    }

    let deviantArtAuthRequired = false;
    const searchPromises: Promise<SourceOutcome>[] = [];

    if (sources.includes("deviantart")) {
        searchPromises.push(
            searchDeviantArt(query, page).then((outcome) => {
                deviantArtAuthRequired = outcome.authRequired;
                return outcome;
            })
        );
    }
    if (sources.includes("google")) searchPromises.push(searchGoogle(query, page));

    const settled = await Promise.allSettled(searchPromises);

    const outcomes = settled
        .filter((result): result is PromiseFulfilledResult<SourceOutcome> => result.status === "fulfilled")
        .map((result) => result.value);

    const results: SearchResult[] = outcomes.flatMap((outcome) => outcome.results);
    const hasMore = outcomes.some((outcome) => outcome.hasMore);

    return NextResponse.json({ results, deviantArtAuthRequired, hasMore, page });
}