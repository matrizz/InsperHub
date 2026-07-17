import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(): Promise<NextResponse> {
    const cookieStore = await cookies();
    const connected = Boolean(
        cookieStore.get("da_access_token")?.value || cookieStore.get("da_refresh_token")?.value
    );

    return NextResponse.json({ connected });
}