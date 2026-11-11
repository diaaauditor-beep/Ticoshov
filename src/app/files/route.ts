import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Secure download of a private file. A short-lived signed URL is created with the
 * caller's own session, so Storage RLS decides whether they may read the file.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!path || path.includes("..")) return new NextResponse("Bad request", { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("Unauthorized", { status: 401 });
  const { data, error } = await supabase.storage.from("private-files").createSignedUrl(path, 60);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
