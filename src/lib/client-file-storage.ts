import { deleteFile, loadFile, saveFile } from "@/lib/storage";

const FOLDER = "client-files";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|txt)$/i;

export function isValidClientId(id: string) {
  return UUID_PATTERN.test(id);
}

export function isValidClientFilename(filename: string) {
  return FILE_PATTERN.test(filename);
}

export async function storeClientFile(clientId: string, filename: string, contents: Uint8Array) {
  await saveFile(FOLDER, clientId, filename, contents);
}

export async function readClientFile(clientId: string, filename: string) {
  return loadFile(FOLDER, clientId, filename);
}

export async function removeClientFile(clientId: string, filename: string) {
  await deleteFile(FOLDER, clientId, filename);
}
