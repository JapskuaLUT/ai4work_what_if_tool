// ui/src/components/layouts/AppBar.tsx

import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Fragment } from "react";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { GlobalModelSelector } from "../global/GlobalModelSelector";

const friendlyNames: Record<string, string> = {
    scheduler: "Scheduler",
    builder: "Builder",
    compare: "Compare Scenarios",
    coursework: "Coursework Scheduling",
    "teaching-plan": "Teaching Plan Scheduling"
};

export function AppBar() {
    const location = useLocation();
    const navigate = useNavigate();

    const canGoBack = location.pathname !== "/";

    const pathSegments = location.pathname.split("/").filter(Boolean); // e.g. ['builder', 'coursework']

    const breadcrumbs = pathSegments.map((segment, idx) => {
        const isLast = idx === pathSegments.length - 1;
        const path = "/" + pathSegments.slice(0, idx + 1).join("/");

        const label =
            friendlyNames[segment] ||
            (segment.match(/^\d+$/)
                ? `Scenario ${segment}`
                : segment
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase()));

        return (
            <Fragment key={path}>
                {idx > 0 && (
                    <span className="mx-1 text-muted-foreground">/</span>
                )}
                <span
                    onClick={() => {
                        if (!isLast) navigate(path);
                    }}
                    className={cn(
                        "cursor-pointer transition-colors",
                        isLast
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground hover:underline"
                    )}
                >
                    {label}
                </span>
            </Fragment>
        );
    });

    return (
        <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {canGoBack && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <div
                    className="flex items-center cursor-pointer"
                    onClick={() => navigate("/")}
                >
                    {/* Add the logo image here */}
                    <img
                        src="/what_if_logo.png"
                        alt="What-If Logo"
                        className="h-8 w-8 mr-2"
                    />
                    <span className="text-xl font-bold">What-If Tool</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Add the global model selector here */}
                <GlobalModelSelector />

                <div className="text-sm flex items-center">
                    <span
                        className="cursor-pointer hover:underline text-muted-foreground"
                        onClick={() => navigate("/")}
                    >
                        Home
                    </span>
                    {pathSegments.length > 0 && (
                        <span className="mx-1 text-muted-foreground">/</span>
                    )}
                    {breadcrumbs}
                </div>
            </div>
        </div>
    );
}
