import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|txt)$/i;

function getStorageDirectory() {
  return process.env.PROPERTY_UPLOAD_DIR || path.join(process.cwd(), "storage", "property-files");
}

export function isValidPropertyId(id: string) {
  return UUID_PATTERN.test(id);
}

export function isValidPropertyFilename(filename: string) {
  return FILE_PATTERN.test(filename);
}

export function getPropertyFilePath(propertyId: string, filename: string) {
  return path.join(getStorageDirectory(), propertyId, filename);
}

export async function storePropertyFile(propertyId: string, filename: string, contents: Uint8Array) {
  const directory = path.join(getStorageDirectory(), propertyId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), contents, { flag: "wx" });
}

export async function readPropertyFile(propertyId: string, filename: string) {
  return readFile(getPropertyFilePath(propertyId, filename));
}

export async function removePropertyFile(propertyId: string, filename: string) {
  try {
    await unlink(getPropertyFilePath(propertyId, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}