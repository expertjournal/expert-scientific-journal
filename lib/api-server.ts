export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface BackendUser {
  id: string;
  email: string;
  role: "AUTHOR" | "EDITOR" | "READER" | "ADMIN" | "author" | "editor" | "reader" | "admin";
  profile?: {
    fullName?: string;
    institution?: string | null;
    orcid?: string | null;
  } | null;
}

export function formatUser(backendUser: BackendUser) {
  const role = backendUser.role.toLowerCase() as "author" | "editor" | "reader" | "admin";
  const fullName = backendUser.profile?.fullName || backendUser.email || "";
  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    id: backendUser.id,
    email: backendUser.email,
    firstName,
    lastName,
    role,
    institution: backendUser.profile?.institution || "",
    orcid: backendUser.profile?.orcid || undefined,
  };
}
