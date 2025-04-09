// ui/src/components/layouts/AppLayout.tsx
import { ReactNode } from "react";
import { AppBar } from "./AppBar";
import { Footer } from "./Footer";

export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <AppBar />
            <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
            <Footer />
        </div>
    );
}
