"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { getStoredArticles, getStoredIssues, syncStoreWithServer } from "@/lib/articles-store";

export default function DoiResolverPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"resolving" | "not_found">("resolving");
  const [searchedDoi, setSearchedDoi] = useState<string>("");

  useEffect(() => {
    async function resolveDoi() {
      try {
        const rawParam = params?.doi;
        const doiPath = Array.isArray(rawParam) ? rawParam.join("/") : String(rawParam || "");
        const fullDoi = doiPath.trim().toLowerCase();
        setSearchedDoi(fullDoi);

        await syncStoreWithServer();
        const articles = getStoredArticles();
        const issues = getStoredIssues();

        // 1. Search in Articles by DOI or ID
        const matchedArticle = articles.find((a) => {
          const itemDoi = (a.doi || "").trim().toLowerCase();
          return itemDoi && (itemDoi.includes(fullDoi) || fullDoi.includes(itemDoi) || a.id.toLowerCase() === fullDoi);
        });

        if (matchedArticle) {
          router.replace(`/article?id=${matchedArticle.id}`);
          return;
        }

        // 2. Search in Issues by DOI, ID, or number pattern (e.g. iss8, iss2)
        let matchedIssue = issues.find((i) => {
          const issueDoi = (i.doi || "").trim().toLowerCase();
          const issueNumDoi = `10.47689/expert-${i.year}-iss${i.number}`;
          const issueVolDoi = `10.47689/expert-${i.year}-vol6-iss${i.number}`;
          return (
            (issueDoi && (issueDoi.includes(fullDoi) || fullDoi.includes(issueDoi))) ||
            issueNumDoi.includes(fullDoi) ||
            fullDoi.includes(issueNumDoi) ||
            issueVolDoi.includes(fullDoi) ||
            fullDoi.includes(issueVolDoi) ||
            i.id.toLowerCase() === fullDoi ||
            fullDoi.includes(`iss${i.number}`)
          );
        });

        if (!matchedIssue && (fullDoi.includes("iss") || fullDoi.includes("issue"))) {
          const numMatch = fullDoi.match(/iss(?:ue)?[-_\s]*(\d+)/i);
          if (numMatch && numMatch[1]) {
            const num = parseInt(numMatch[1], 10);
            matchedIssue = issues.find((i) => i.number === num);
          }
        }

        if (matchedIssue) {
          router.replace(`/journal?issueId=${matchedIssue.id}`);
          return;
        }

        // 3. Smart fallback to latest published issue or article
        if (issues.length > 0) {
          const latestPub = issues.find((i) => i.status === "PUBLISHED") || issues[0];
          router.replace(`/journal?issueId=${latestPub.id}`);
          return;
        }

        if (articles.length > 0) {
          router.replace(`/article?id=${articles[0].id}`);
          return;
        }

        setStatus("not_found");
      } catch (e) {
        console.error("DOI Resolution Error:", e);
        setStatus("not_found");
      }
    }

    resolveDoi();
  }, [params, router]);

  if (status === "resolving") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <Header activePage="/journal" />
        <div style={{ maxWidth: "500px", margin: "100px auto", padding: "40px", background: "#fff", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔍</div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px" }}>
            DOI Indeksi izlanmoqda / Resolving DOI...
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            DOI: <code style={{ color: "#2563eb", fontWeight: "bold" }}>{searchedDoi}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header activePage="/journal" />
      <div style={{ maxWidth: "500px", margin: "100px auto", padding: "40px", background: "#fff", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px" }}>
          DOI Topilmadi / DOI Not Found
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>
          Kiritilgan DOI indeksi bazada topilmadi: <b>{searchedDoi}</b>
        </p>
        <button
          onClick={() => router.push("/journal")}
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 22px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
        >
          Jurnal nashrlariga o'tish →
        </button>
      </div>
    </div>
  );
}
