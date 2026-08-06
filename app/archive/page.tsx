"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "../globals.css";
import Header from "@/components/Header";
import { getStoredIssues, syncStoreWithServer, StoredIssue } from "@/lib/articles-store";

export default function ArchivePage() {
  const router = useRouter();
  const [issues, setIssues] = useState<StoredIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArchiveData() {
      try {
        setLoading(true);
        await syncStoreWithServer();
        const storedIssues = getStoredIssues();
        const publishedOnly = storedIssues.filter((item) => item.status === "PUBLISHED");
        setIssues(publishedOnly.length > 0 ? publishedOnly : storedIssues);
      } catch (e) {
        console.error("Archive fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchArchiveData();
  }, []);

  return (
    <div className="archive-page" style={{ minHeight: "100vh", background: "#f8fafc", color: "#1e293b" }}>
      <Header activePage="/archive" />

      <main style={{ maxWidth: "1140px", margin: "32px auto", padding: "0 20px 60px" }}>
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "28px 36px", marginBottom: "28px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px 0" }}>
              Архив выпусков журнала
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              Полный реестр всех опубликованных номеров Expert Scientific Journal
            </p>
          </div>
          <div style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", color: "#475569" }}>
            Всего выпусков: {issues.length}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
            Загрузка архива выпусков...
          </div>
        ) : issues.length === 0 ? (
          <div style={{ background: "#ffffff", borderRadius: "12px", padding: "60px 20px", textAlign: "center", color: "#64748b", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            В архиве пока нет опубликованных выпусков. Muharrir paneli orqali yangi son nashr eting.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {issues.map((iss) => (
              <div
                key={iss.id}
                onClick={() => router.push(`/journal?issueId=${iss.id}`)}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  cursor: "pointer",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                    {iss.coverUrl ? (
                      <img src={iss.coverUrl} alt="Cover" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                    ) : (
                      <div style={{ width: "80px", height: "110px", background: "linear-gradient(135deg, #0f2744, #1e3a8a)", color: "#fff", borderRadius: "6px", display: "grid", placeItems: "center", fontSize: "11px", fontWeight: "bold", textAlign: "center", padding: "8px" }}>
                        EXPERT<br />No {iss.number}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "10px" }}>
                        ● Published
                      </span>
                      <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: "8px 0 4px 0" }}>
                        Выпуск № {iss.number} ({iss.year})
                      </h3>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{iss.description}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/journal?issueId=${iss.id}`);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Открыть выпуск →
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}