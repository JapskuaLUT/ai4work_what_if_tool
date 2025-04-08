// ui/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "@/pages/MainPage";
import SchedulerPage from "@/pages/SchedulerPage";
import ComparePage from "@/pages/ComparePage";
import BuilderPage from "./pages/BuilderPage";
import { AppLayout } from "./components/layouts/AppLayout";

export default function App() {
    return (
        <BrowserRouter>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route
                        path="/scheduler/:scenarioId"
                        element={<SchedulerPage />}
                    />
                    <Route
                        path="/scheduler/compare"
                        element={<ComparePage />}
                    />
                    <Route
                        path="/builder/:projectId"
                        element={<BuilderPage />} // <-- Add this route
                    />
                </Routes>
            </AppLayout>
        </BrowserRouter>
    );
}
