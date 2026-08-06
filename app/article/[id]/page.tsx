"use client";

import { use } from "react";
import ArticleDetailPage from "../page";

export default function DynamicArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ArticleDetailPage />;
}
