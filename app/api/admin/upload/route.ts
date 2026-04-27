import { requireAdmin } from "@/lib/adminAuth";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (5 Mo max)" },
      { status: 400 },
    );
  }
  const type = file.type;
  if (!ALLOWED.has(type)) {
    return NextResponse.json(
      { error: "Format non autorisé (jpg, png, webp)" },
      { status: 400 },
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const ts = Date.now();
  const ext =
    type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const finalName = `${ts}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const relDir = join("public", "uploads", "products");
  const dir = join(process.cwd(), relDir);
  await mkdir(dir, { recursive: true });
  const abs = join(dir, finalName);
  await writeFile(abs, buf);
  const url = `/uploads/products/${finalName}`;
  return NextResponse.json({ url });
}
