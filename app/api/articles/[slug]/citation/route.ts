import { NextRequest, NextResponse } from "next/server";
import { getStoredArticles, getStoredIssues } from "@/lib/articles-store";
import { CitationService } from "@/lib/services/CitationService";
import { MetadataService } from "@/lib/services/MetadataService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") || "bibtex").toLowerCase();

    const articles = getStoredArticles();
    const issues = getStoredIssues();

    const article = articles.find((a) => {
      const computedSlug = MetadataService.slugify(a.title, a.id);
      return a.id === slug || computedSlug === slug || a.doi?.includes(slug);
    });

    if (!article) {
      return NextResponse.json({ message: "Статья не найдена в системе" }, { status: 404 });
    }

    const assignedIssue = issues.find((i) => i.id === article.issueId) || issues[0];

    const inputData = {
      id: article.id,
      slug: MetadataService.slugify(article.title, article.id),
      title: article.title,
      abstract: article.abstract,
      scientificField: article.scientificField || "Право и правовые исследования",
      language: article.language || "Русский",
      doi: article.doi || `10.47689/expert-2026-iss10-${article.id}`,
      issn: "3093-1242",
      journalTitle: assignedIssue?.journalTitle || "Expert Scientific Journal",
      volume: assignedIssue?.year || 2026,
      issueNumber: assignedIssue?.number || 10,
      pages: article.pages || "1-12",
      publicationDate: article.submissionDate || article.lastUpdated,
      lastUpdated: article.lastUpdated,
      keywords: article.keywords || ["право", "юридические науки"],
      authors: [
        {
          fullName: article.authorName || "Автор",
          email: article.authorEmail,
          institution: "Expert Scientific Journal",
        },
      ],
    };

    switch (format) {
      case "bibtex":
      case "bib":
        return new NextResponse(CitationService.exportBibTeX(inputData), {
          headers: {
            "Content-Type": "application/x-bibtex; charset=utf-8",
            "Content-Disposition": `attachment; filename="${inputData.slug}.bib"`,
          },
        });
      case "ris":
        return new NextResponse(CitationService.exportRIS(inputData), {
          headers: {
            "Content-Type": "application/x-research-info-systems; charset=utf-8",
            "Content-Disposition": `attachment; filename="${inputData.slug}.ris"`,
          },
        });
      case "apa":
        return NextResponse.json({ format: "APA", citation: CitationService.formatAPA(inputData) });
      case "mla":
        return NextResponse.json({ format: "MLA", citation: CitationService.formatMLA(inputData) });
      case "chicago":
        return NextResponse.json({ format: "Chicago", citation: CitationService.formatChicago(inputData) });
      case "harvard":
        return NextResponse.json({ format: "Harvard", citation: CitationService.formatHarvard(inputData) });
      case "ieee":
        return NextResponse.json({ format: "IEEE", citation: CitationService.formatIEEE(inputData) });
      default:
        return NextResponse.json({ format: "APA", citation: CitationService.formatAPA(inputData) });
    }
  } catch (error: any) {
    console.error("Citation endpoint error:", error);
    return NextResponse.json({ message: "Ошибка при формировании цитирования" }, { status: 500 });
  }
}
