"use client";

import React, { useState, useEffect } from "react";
import { getStoredNotifications, markNotificationsAsReadInStore, StoredNotification, syncStoreWithServer } from "@/lib/articles-store";

export default function NotificationCenter({ role }: { role: "author" | "editor" }) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = () => {
    const all = getStoredNotifications();
    const filtered = all.filter((n) => !n.userRole || n.userRole === role || n.userRole === "all");
    setNotifications(filtered);
  };

  useEffect(() => {
    loadNotifications();
    const handleStorage = () => loadNotifications();
    window.addEventListener("storage", handleStorage);

    const timer = setInterval(async () => {
      await syncStoreWithServer();
      loadNotifications();
    }, 2500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(timer);
    };
  }, [role]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    markNotificationsAsReadInStore();
    loadNotifications();
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          position: "relative",
          padding: "6px 10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
        title="Xabarnomalar markazi / Notification Center"
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "900",
              borderRadius: "10px",
              padding: "1px 6px",
              lineHeight: 1,
              boxShadow: "0 2px 4px rgba(239,68,68,0.4)",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "42px",
            width: "340px",
            maxHeight: "420px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
            <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
              🔔 Xabarnomalar ({unreadCount})
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
              >
                O'qilgan deb belgilash
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                Hozircha yangi xabarnomalar yo'q.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: n.isRead ? "#ffffff" : "#eff6ff",
                    borderLeft: n.isRead ? "3px solid #cbd5e1" : "3px solid #2563eb",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", marginBottom: "2px" }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.35 }}>
                    {n.message}
                  </div>
                  <small style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                    {new Date(n.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
