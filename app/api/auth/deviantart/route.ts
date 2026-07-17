import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function generateCodeVerifier(): string {
    return crypto.randomBytes(64).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
    return crypto.randomBytes(16).toString("hex");
}

export async function GET(): Promise<NextResponse> {
    const clientId = process.env.DEVIANTART_CLIENT_ID;
    const redirectUri = process.env.DEVIANTART_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "DEVIANTART_CLIENT_ID/DEVIANTART_REDIRECT_URI não configuradas" },
            { status: 500 }
        );
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    const cookieStore = await cookies();
    cookieStore.set("da_code_verifier", codeVerifier, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
    });
    cookieStore.set("da_oauth_state", state, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
    });

    const authorizeUrl = new URL("https://www.deviantart.com/oauth2/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "browse");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    return NextResponse.redirect(authorizeUrl.toString());
}