import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageDriver = "local" | "supabase";

function resolveDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
}

function localRoot() {
  return process.env.UPLOAD_ROOT || path.join(process.cwd(), "storage");
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "inmobiliaria";
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para usar el driver supabase");
  }
  return { url: url.replace(/\/$/, ""), key, bucket };
}

function objectPath(folder: string, groupId: string, filename: string) {
  return `${folder}/${groupId}/${filename}`;
}

export async function saveFile(folder: string, groupId: string, filename: string, contents: Uint8Array) {
  if (resolveDriver() === "supabase") {
    const { url, key, bucket } = supabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath(folder, groupId, filename)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/octet-stream",
        "x-upsert": "false",
      },
      body: new Uint8Array(contents),
    });
    if (!response.ok) throw new Error(`No se pudo subir el archivo (${response.status})`);
    return;
  }

  const directory = path.join(/*turbopackIgnore: true*/ localRoot(), folder, groupId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ directory, filename), contents, { flag: "wx" });
}

export async function loadFile(folder: string, groupId: string, filename: string): Promise<Uint8Array> {
  if (resolveDriver() === "supabase") {
    const { url, key, bucket } = supabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath(folder, groupId, filename)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Archivo no encontrado (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }

  return readFile(path.join(/*turbopackIgnore: true*/ localRoot(), folder, groupId, filename));
}

export async function deleteFile(folder: string, groupId: string, filename: string) {
  if (resolveDriver() === "supabase") {
    const { url, key, bucket } = supabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath(folder, groupId, filename)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`No se pudo eliminar el archivo (${response.status})`);
    }
    return;
  }

  try {
    await unlink(path.join(/*turbopackIgnore: true*/ localRoot(), folder, groupId, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
