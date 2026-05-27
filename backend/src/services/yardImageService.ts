// backend/src/services/yardImageService.ts
//
// File I/O for yard-image uploads. The HTTP layer in yardRoutes.ts handles
// validation and DB updates; this file is just the filesystem side so
// it's easy to unit-test the path/cleanup logic in isolation.

import { mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const UPLOAD_ROOT = "uploads/yard_images";

const MIME_TO_EXT: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg"
};

export function mimeToExt(mime: string): string | null {
    return MIME_TO_EXT[mime] ?? null;
}

export function publicUrlForImage(caseId: string, ext: string): string {
    const base = process.env.SERVER_URL ?? "http://localhost:8000";
    return `${base}/uploads/yard_images/${caseId}.${ext}`;
}

async function ensureRoot(): Promise<void> {
    await mkdir(UPLOAD_ROOT, { recursive: true });
}

/**
 * Write the file at `uploads/yard_images/{caseId}.{ext}`, then delete any
 * previous file for the same caseId under a different extension (e.g. the
 * user replaces a .png upload with a .jpg).
 */
export async function writeYardImage(
    caseId: string,
    ext: string,
    bytes: ArrayBuffer
): Promise<{ filename: string; absPath: string }> {
    await ensureRoot();
    const filename = `${caseId}.${ext}`;
    const absPath = join(UPLOAD_ROOT, filename);
    await Bun.write(absPath, bytes);
    await cleanupOtherExtensions(caseId, ext);
    return { filename, absPath };
}

/**
 * Remove every `{caseId}.*` file in the upload directory. Returns the
 * number of files actually removed.
 */
export async function deleteYardImage(caseId: string): Promise<number> {
    await ensureRoot();
    const entries = await readdir(UPLOAD_ROOT);
    let removed = 0;
    for (const f of entries) {
        if (f === `${caseId}` || f.startsWith(`${caseId}.`)) {
            await unlink(join(UPLOAD_ROOT, f)).catch(() => undefined);
            removed++;
        }
    }
    return removed;
}

async function cleanupOtherExtensions(
    caseId: string,
    keepExt: string
): Promise<void> {
    const entries = await readdir(UPLOAD_ROOT);
    for (const f of entries) {
        if (!f.startsWith(`${caseId}.`)) continue;
        if (f === `${caseId}.${keepExt}`) continue;
        await unlink(join(UPLOAD_ROOT, f)).catch(() => undefined);
    }
}
