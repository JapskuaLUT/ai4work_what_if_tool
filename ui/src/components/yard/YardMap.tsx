// ui/src/components/yard/YardMap.tsx

import { useRef, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImagePlus, RefreshCcw, Trash2, AlertTriangle } from "lucide-react";

interface Props {
    imagePath: string | null;
    name: string;
    /**
     * Called when the user picks a file to upload. Should return when
     * the upload + downstream refresh completes (or throws on failure).
     * Omit to render the map as read-only.
     */
    onUpload?: (file: File) => Promise<void>;
    /** Called when the user clicks Remove. Omit to hide the button. */
    onRemove?: () => Promise<void>;
}

const ACCEPTED = "image/png,image/jpeg,image/webp,image/svg+xml";
const ACCEPTED_HUMAN = "PNG, JPEG, WebP or SVG";
const MAX_BYTES = 5 * 1024 * 1024;

export function YardMap({ imagePath, name, onUpload, onRemove }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleFile(file: File | undefined) {
        setError(null);
        if (!file || !onUpload) return;
        if (file.size > MAX_BYTES) {
            setError(
                `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 5 MB.`
            );
            return;
        }
        setBusy("upload");
        try {
            await onUpload(file);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setBusy(null);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    async function handleRemove() {
        if (!onRemove) return;
        if (!confirm("Remove the stored yard image for this case?")) return;
        setBusy("remove");
        setError(null);
        try {
            await onRemove();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Removal failed");
        } finally {
            setBusy(null);
        }
    }

    const canEdit = !!onUpload;

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle>{name}</CardTitle>
                    {canEdit && (
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="file"
                                accept={ACCEPTED}
                                onChange={(e) =>
                                    handleFile(e.target.files?.[0])
                                }
                                className="hidden"
                            />
                            <Button
                                size="sm"
                                variant={imagePath ? "outline" : "default"}
                                onClick={() => inputRef.current?.click()}
                                disabled={busy !== null}
                            >
                                {imagePath ? (
                                    <>
                                        <RefreshCcw className="h-3 w-3 mr-1" />
                                        {busy === "upload"
                                            ? "Uploading…"
                                            : "Replace"}
                                    </>
                                ) : (
                                    <>
                                        <ImagePlus className="h-3 w-3 mr-1" />
                                        {busy === "upload"
                                            ? "Uploading…"
                                            : "Upload image"}
                                    </>
                                )}
                            </Button>
                            {imagePath && onRemove && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleRemove}
                                    disabled={busy !== null}
                                    title="Remove the stored image"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                {canEdit && (
                    <p className="text-xs text-gray-500 mt-1">
                        Accepts {ACCEPTED_HUMAN}, up to 5 MB. Uploading
                        replaces any existing image for this case.
                    </p>
                )}
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {imagePath ? (
                    <img
                        src={imagePath}
                        alt={`Yard map: ${name}`}
                        className="w-full h-auto rounded border"
                    />
                ) : (
                    <EmptyState
                        canEdit={canEdit}
                        onPick={() => inputRef.current?.click()}
                    />
                )}
            </CardContent>
        </Card>
    );
}

function EmptyState({
    canEdit,
    onPick
}: {
    canEdit: boolean;
    onPick: () => void;
}) {
    if (!canEdit) {
        return (
            <p className="text-sm text-gray-500">No yard map provided.</p>
        );
    }
    return (
        <button
            type="button"
            onClick={onPick}
            className="w-full border-2 border-dashed border-gray-300 rounded p-8 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors cursor-pointer"
        >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">
                Upload a yard layout image
            </span>
            <span className="text-xs">
                Click to choose a {ACCEPTED_HUMAN.toLowerCase()} file
            </span>
        </button>
    );
}
