"use client";

import { useEffect } from "react";
import { getStoredArticles, getStoredIssues, getStoredMessages, StoredArticle, StoredIssue, StoredMessage } from "./articles-store";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://db.dducsbvlurlvqygqolgr.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkdWNzYnZsdXJsdnF5Z3FvbGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NTYwMDAsImV4cCI6MjAyNTQzMjAwMH0.expert-journal-anon-token";

export interface RealtimePayload<T = any> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  new: T;
  old: Partial<T>;
}

type RealtimeCallback<T> = (payload: RealtimePayload<T>) => void;

class RealtimeChannelManager {
  private listeners: Map<string, Set<RealtimeCallback<any>>> = new Map();
  private ws: WebSocket | null = null;
  private isConnected = false;

  constructor() {
    this.initWebSocket();
  }

  private initWebSocket() {
    if (typeof window === "undefined") return;

    try {
      // Connect to Supabase Realtime WebSocket Endpoint
      const wsUrl = `${SUPABASE_URL.replace("https://", "wss://")}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Join realtime channel
        this.ws?.send(
          JSON.stringify({
            topic: "realtime:public",
            event: "phx_join",
            payload: { config: { postgres_changes: [{ event: "*", schema: "public" }] } },
            ref: "1",
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === "postgres_changes" && msg.payload) {
            const table = msg.payload.table;
            const set = this.listeners.get(table);
            if (set) {
              set.forEach((cb) => cb(msg.payload));
            }
          }
        } catch (_) {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // Reconnect after 5 seconds
        setTimeout(() => this.initWebSocket(), 5000);
      };
    } catch (e) {
      console.warn("Supabase Realtime fallback enabled.");
    }
  }

  public subscribe<T>(table: "articles" | "issues" | "messages", callback: RealtimeCallback<T>) {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);

    return () => {
      this.listeners.get(table)?.delete(callback);
    };
  }

  public notifyLocally<T>(table: "articles" | "issues" | "messages", eventType: "INSERT" | "UPDATE" | "DELETE", data: T) {
    const set = this.listeners.get(table);
    if (set) {
      set.forEach((cb) => cb({ eventType, schema: "public", table, new: data, old: {} }));
    }
  }
}

export const realtimeManager = new RealtimeChannelManager();

/**
 * Hook for components to listen to real-time changes on articles, issues, and chat
 */
export function useSupabaseRealtime(
  table: "articles" | "issues" | "messages",
  onDataChange: () => void
) {
  useEffect(() => {
    const unsubscribe = realtimeManager.subscribe(table, () => {
      onDataChange();
    });
    return () => {
      unsubscribe();
    };
  }, [table, onDataChange]);
}
