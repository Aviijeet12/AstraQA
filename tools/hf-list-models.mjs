import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadEnvFile = (filePath) => {
  try {
    const txt = readFileSync(filePath, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 0) continue;
      const name = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[name]) process.env[name] = value;
    }
  } catch {
    // ignore
  }
};

loadEnvFile(resolve(process.cwd(), ".env.local"));

const key = process.env.HF_API_KEY;
if (!key) {
  console.error("Missing HF_API_KEY");
  process.exit(2);
}

const res = await fetch("https://router.huggingface.co/v1/models", {
  headers: { Authorization: `Bearer ${key}` },
});

const text = await res.text();
console.log("status", res.status);

let data;
try {
  data = JSON.parse(text);
} catch {
  console.log(text.slice(0, 2000));
  process.exit(0);
}

const models = Array.isArray(data?.data) ? data.data : [];
const isHfInference = (m) =>
  Array.isArray(m?.providers) &&
  m.providers.some((p) => String(p?.provider || "").toLowerCase().includes("hf"));

const hfModels = models.filter(isHfInference).map((m) => m.id);

console.log("hfModels", hfModels.length);
for (const id of hfModels.slice(0, 40)) {
  console.log(id);
}
