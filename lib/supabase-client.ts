const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://db.dducsbvlurlvqygqolgr.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkdWNzYnZsdXJsdnF5Z3FvbGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NTYwMDAsImV4cCI6MjAyNTQzMjAwMH0.expert-journal-anon-token";

export interface SupabaseResponse<T = any> {
  data: T | null;
  error: any | null;
}

class NativeSupabaseQuery {
  private tableName: string;
  private columns: string;

  constructor(tableName: string, columns = "*") {
    this.tableName = tableName;
    this.columns = columns;
  }

  order(_col: string, _opts?: any) {
    return this;
  }

  async execute(): Promise<SupabaseResponse> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.tableName}?select=${this.columns}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) return { data: null, error: new Error(`HTTP ${res.status}`) };
      const data = await res.json();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  then<TResult1 = SupabaseResponse, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class NativeSupabaseTable {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns = "*") {
    return new NativeSupabaseQuery(this.tableName, columns);
  }

  async upsert(values: any) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.tableName}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) return { error: new Error(`HTTP ${res.status}`) };
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }

  update(values: any) {
    return {
      eq: async (column: string, value: any) => {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${this.tableName}?${column}=eq.${value}`, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });
          if (!res.ok) return { error: new Error(`HTTP ${res.status}`) };
          return { error: null };
        } catch (error: any) {
          return { error };
        }
      },
    };
  }
}

class NativeSupabaseAuth {
  async signInWithPassword({ email, password }: any) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return { data: { user: null, session: null }, error: new Error(`Auth failed`) };
      const data = await res.json();
      return { data: { user: data.user, session: data }, error: null };
    } catch (e: any) {
      return { data: { user: null, session: null }, error: e };
    }
  }
}

export const supabase = {
  from: (table: string) => new NativeSupabaseTable(table),
  auth: new NativeSupabaseAuth(),
};
