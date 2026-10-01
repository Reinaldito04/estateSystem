import { deleteFile, loadFile, saveFile } from "@/lib/storage";

const FOLDER = "property-files";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|txt)$/i;

export function isValidPropertyId(id: string) {
  return UUID_PATTERN.test(id);
}

export function isValidPropertyFilename(filename: string) {
  return FILE_PATTERN.test(filename);
}

export async function storePropertyFile(propertyId: string, filename: string, contents: Uint8Array) {
  await saveFile(FOLDER, propertyId, filename, contents);
}

export async function readPropertyFile(propertyId: string, filename: string) {
  return loadFile(FOLDER, propertyId, filename);
}

export async function removePropertyFile(propertyId: string, filename: string) {
  await deleteFile(FOLDER, propertyId, filename);
}
