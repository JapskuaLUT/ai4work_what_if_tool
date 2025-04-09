// ui/src/App.tsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layouts/AppLayout";
import { ModelProvider } from "./contexts/ModelContext";
import MainPage from "./pages/MainPage";
import BuilderPage from "./pages/BuilderPage";
import ScheduleResultsPage from "./pages/ScheduleResultsPage";
import ComparePage from "./pages/ComparePage";
import OllamaPage from "./pages/OllamaPage";

function App() {
    return (
        <ModelProvider>
            <Router>
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
                        <Route path="/compare" element={<ComparePage />} />
                        <Route path="/test/ollama" element={<OllamaPage />} />
                    </Routes>
                </AppLayout>
            </Router>
        </ModelProvider>
    );
}

export default App;
