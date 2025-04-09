// ui/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "@/pages/MainPage";
import BuilderPage from "./pages/BuilderPage";
import { AppLayout } from "./components/layouts/AppLayout";
import ScheduleResultsPage from "./pages/ScheduleResultsPage";
import OllamaPage from "./pages/OllamaPage";

export default function App() {
    return (
        <BrowserRouter>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route
                        path="/builder/:projectId"
                        element={<BuilderPage />}
                    />
                    <Route
                        path="/results/:projectId"
                        element={<ScheduleResultsPage />}
                    />
                    <Route path="/test/ollama" element={<OllamaPage />} />
                </Routes>
            </AppLayout>
        </BrowserRouter>
    );
}
