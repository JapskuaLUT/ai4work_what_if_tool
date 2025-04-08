// ui/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "@/pages/MainPage";
import BuilderPage from "./pages/BuilderPage";
import { AppLayout } from "./components/layouts/AppLayout";
import ScheduleResultsPage from "./pages/ScheduleResultsPage";

export default function App() {
    return (
        <BrowserRouter>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route
                        path="/builder/:param"
                        element={<BuilderPage />} // <-- Add this route
                    />
                    <Route path="/results" element={<ScheduleResultsPage />} />
                </Routes>
            </AppLayout>
        </BrowserRouter>
    );
}
