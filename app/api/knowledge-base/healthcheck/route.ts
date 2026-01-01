import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { supabase, SUPABASE_STORAGE_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

const normalizeKey = (p: string) => (p || "").replace(/^\/*/, "").replace(/\\/g, "/");

const isSafeStorageKey = (p: string) => {
  if (!p) return false;
  // Keys must be object paths, not URLs.
  if (p.startsWith("http://") || p.startsWith("https://") || p.includes("://")) return false;
  if (p.includes("\\")) return false;
  if (p.startsWith("/")) return false;
  if (p.includes("..")) return false;
  return true;
};

const getBucketsToTry = () => {
  const buckets = new Set<string>();
  buckets.add(SUPABASE_STORAGE_BUCKET);
  if (SUPABASE_STORAGE_BUCKET !== "astraA") buckets.add("astraA");
  return Array.from(buckets.values());
};

const looksLegacyPath = (p: string) => {
  const s = (p || "").trim();
  if (!s) return false;
  if (s.includes("tmp/uploads/")) return true;
  if (s.startsWith("../") || s.startsWith("..\\")) return true;
  if (/^[a-zA-Z]:\\/.test(s)) return true;
  return false;
};

async function objectExists(bucket: string, key: string) {
  const normalized = normalizeKey(key);
  const parts = normalized.split("/").filter(Boolean);
  const name = parts.pop();
  const dir = parts.join("/");

  if (!name) return { exists: false, error: "empty_key" } as const;

  const { data, error } = await supabase.storage.from(bucket).list(dir, {
    limit: 1000,
    search: name,
  });

  if (error) {
    const msg = (error as any)?.message ? String((error as any).message) : JSON.stringify(error);
    return { exists: false, error: msg } as const;
  }

  const exists = Array.isArray(data) && data.some((o: any) => o?.name === name);
  return { exists } as const;
}

export async function GET() {
  const { userId, response } = await requireUserId();
  if (!userId) return response;

  const files = await prisma.file.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, filename: true, path: true, mime: true, size: true, createdAt: true },
  });

  const bucketsToTry = getBucketsToTry();

  const results: Array<{
    id: string;
    filename: string;
    path: string | null;
    mime: string | null;
    legacyPath: boolean;
    canonicalKey: string;
    found: null | { bucket: string; key: string };
    attempts: Array<{ bucket: string; key: string; exists: boolean; error?: string }>;
    issues: string[];
  }> = [];

  // Sequential checks keep load predictable for larger KBs.
  for (const f of files) {
    const storagePath = normalizeKey(String(f.path || ""));
    const filename = String(f.filename || "").split("/").pop() || "";

    const canonicalKey = normalizeKey(`knowledge-base/${userId}/${filename}`);

    const candidateKeys = new Set<string>();
    if (filename) candidateKeys.add(canonicalKey);
    if (storagePath && isSafeStorageKey(storagePath)) candidateKeys.add(storagePath);
    const basename = storagePath.split("/").pop() || "";
    if (basename) candidateKeys.add(normalizeKey(`knowledge-base/${userId}/${basename}`));
    if (basename) candidateKeys.add(normalizeKey(`uploads/${userId}/${basename}`));
    if (filename) candidateKeys.add(normalizeKey(`${userId}/knowledge-base/${userId}/${filename}`));
    if (basename) candidateKeys.add(normalizeKey(`${userId}/knowledge-base/${userId}/${basename}`));
    if (filename) candidateKeys.add(normalizeKey(`${userId}/knowledge-base/${filename}`));
    if (basename) candidateKeys.add(normalizeKey(`${userId}/knowledge-base/${basename}`));

    const attempts: Array<{ bucket: string; key: string; exists: boolean; error?: string }> = [];
    let found: null | { bucket: string; key: string } = null;

    for (const key of candidateKeys) {
      if (!isSafeStorageKey(key)) continue;
      for (const bucket of bucketsToTry) {
        const res = await objectExists(bucket, key);
        attempts.push({ bucket, key, exists: res.exists, ...(res.exists ? {} : res.error ? { error: res.error } : {}) });
        if (res.exists) {
          found = { bucket, key };
          break;
        }
      }
      if (found) break;
    }

    const issues: string[] = [];
    const legacyPath = looksLegacyPath(String(f.path || ""));
    if (legacyPath) issues.push("legacy_db_path");
    if (!isSafeStorageKey(storagePath) && storagePath) issues.push("unsafe_db_path");
    if (!found) issues.push("missing_in_supabase");
    if (found && found.key !== canonicalKey) issues.push("non_canonical_key");

    results.push({
      id: f.id,
      filename: f.filename,
      path: f.path,
      mime: f.mime,
      legacyPath,
      canonicalKey,
      found,
      attempts: attempts.slice(0, 12),
      issues,
    });
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.issues.length === 0).length,
    missing: results.filter((r) => r.issues.includes("missing_in_supabase")).length,
    legacy: results.filter((r) => r.issues.includes("legacy_db_path")).length,
    nonCanonical: results.filter((r) => r.issues.includes("non_canonical_key")).length,
  };

  const status = summary.missing === 0 && summary.legacy === 0 ? "ok" : "issues";

  return NextResponse.json({
    status,
    bucket: SUPABASE_STORAGE_BUCKET,
    bucketsChecked: bucketsToTry,
    summary,
    files: results,
  });
}
