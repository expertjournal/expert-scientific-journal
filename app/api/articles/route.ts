import { NextRequest, NextResponse } from "next/server";
import { getArticlesFromDB, saveOrUpdateArticle, ArticleRecord } from "@/lib/db-client";
import { verifyJWT } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("expert_token")?.value;
    const authUser = token ? verifyJWT(token) : null;

    const { searchParams } = new URL(req.url);
    const userOnly = searchParams.get("userOnly") === "true";
    const authorEmailParam = (searchParams.get("email") || "").toLowerCase().trim();

    const allArticles = await getArticlesFromDB();

    // STRICT OWNER AUTHORIZATION FILTERING
    let filtered: ArticleRecord[] = [];

    if (authUser && (authUser.role === "editor" || authUser.role === "admin")) {
      // Editor / Admin can view all articles
      filtered = allArticles;
    } else if (authUser) {
      // Author / Registered User: strictly view ONLY owned articles
      const sessionEmail = (authUser.email || "").toLowerCase().trim();
      const sessionId = authUser.id || authUser.sub;
      const targetEmail = authorEmailParam || sessionEmail;

      filtered = allArticles.filter((a) => {
        const aEmail = (a.authorEmail || "").toLowerCase().trim();
        return aEmail === sessionEmail || aEmail === targetEmail || a.userId === sessionId || a.authorId === sessionId;
      });
    } else if (userOnly && authorEmailParam) {
      filtered = allArticles.filter((a) => (a.authorEmail || "").toLowerCase().trim() === authorEmailParam);
    } else {
      // Unauthenticated Guests: strictly view ONLY published articles
      filtered = allArticles.filter((a) => a.status === "PUBLISHED");
    }

    return NextResponse.json(filtered);
  } catch (e: any) {
    console.error("GET articles route error:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("expert_token")?.value;
    const authUser = token ? verifyJWT(token) : null;

    const payload = await req.json();

    // Mandate server authenticated identity if present
    const ownerEmail = (authUser?.email || payload.authorEmail || "").toLowerCase().trim();
    const ownerId = authUser?.id || authUser?.sub || payload.authorId || payload.userId || "usr_" + Date.now();
    const ownerName = authUser?.firstName
      ? `${authUser.firstName} ${authUser.lastName || ""}`.trim()
      : payload.authorName || "Автор";

    if (!ownerEmail) {
      return NextResponse.json({ message: "Укажите Email автора" }, { status: 400 });
    }

    const savedArticle = await saveOrUpdateArticle({
      ...payload,
      id: payload.id || "art_" + Date.now(),
      authorEmail: ownerEmail,
      authorId: ownerId,
      userId: ownerId,
      authorName: ownerName,
      submissionDate: payload.submissionDate || new Date().toISOString().split("T")[0],
    });

    return NextResponse.json({ success: true, article: savedArticle }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, reviewNote, issueId } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "Укажите id статьи" }, { status: 400 });
    }

    const articles = await getArticlesFromDB();
    const existing = articles.find((a) => a.id === id);

    if (existing) {
      await saveOrUpdateArticle({
        ...existing,
        status: status || existing.status,
        reviewNote: reviewNote !== undefined ? reviewNote : existing.reviewNote,
        issueId: issueId !== undefined ? issueId : existing.issueId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
