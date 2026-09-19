import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export const hashFile = async (path: string) => sha256(await readFile(path));
export const hostFingerprint = (url: string) =>
  sha256(new URL(url).hostname).slice(0, 16);
