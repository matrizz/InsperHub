import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

interface DeviantArtTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const errorParam = request.nextUrl.searchParams.get("error");

    const cookieStore = await cookies();
    const savedState = cookieStore.get("da_oauth_state")?.value;
    const codeVerifier = cookieStore.get("da_code_verifier")?.value;

    cookieStore.delete("da_oauth_state");
    cookieStore.delete("da_code_verifier");

    if (errorParam) {
        return NextResponse.redirect(new URL(`/?deviantart_error=${errorParam}`, request.url));
    }

    if (!code || !state || !savedState || state !== savedState || !codeVerifier) {
        return NextResponse.redirect(new URL("/?deviantart_error=invalid_state", request.url));
    }

    const clientId = process.env.DEVIANTART_CLIENT_ID;
    const clientSecret = process.env.DEVIANTART_CLIENT_SECRET;
    const redirectUri = process.env.DEVIANTART_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.redirect(new URL("/?deviantart_error=server_misconfigured", request.url));
    }

    const params = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch("https://www.deviantart.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });

    if (!tokenResponse.ok) {
        return NextResponse.redirect(new URL("/?deviantart_error=token_exchange_failed", request.url));
    }

    const data: DeviantArtTokenResponse = await tokenResponse.json();

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

    return NextResponse.redirect(new URL("/?deviantart_connected=1", request.url));
}