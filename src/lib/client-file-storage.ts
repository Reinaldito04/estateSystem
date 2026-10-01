import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|txt)$/i;

function getStorageDirectory() {
  return process.env.CLIENT_UPLOAD_DIR || path.join(process.cwd(), "storage", "client-files");
}

export function isValidClientId(id: string) {
  return UUID_PATTERN.test(id);
}

export function isValidClientFilename(filename: string) {
  return FILE_PATTERN.test(filename);
}

export function getClientFilePath(clientId: string, filename: string) {
  return path.join(getStorageDirectory(), clientId, filename);
}

export async function storeClientFile(clientId: string, filename: string, contents: Uint8Array) {
  const directory = path.join(getStorageDirectory(), clientId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), contents, { flag: "wx" });
}

export async function readClientFile(clientId: string, filename: string) {
  return readFile(getClientFilePath(clientId, filename));
}

export async function removeClientFile(clientId: string, filename: string) {
  try {
    await unlink(getClientFilePath(clientId, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
