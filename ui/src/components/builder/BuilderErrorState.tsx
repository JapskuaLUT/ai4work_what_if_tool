// ui/src/components/builder/BuilderErrorState.tsx

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronLeft } from "lucide-react";

type BuilderErrorStateProps = {
    onBack: () => void;
};

export function BuilderErrorState({ onBack }: BuilderErrorStateProps) {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load coursework plan. Please try again later.
                </AlertDescription>
            </Alert>
            <Button className="mt-4" onClick={onBack}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
        </div>
    );
}
