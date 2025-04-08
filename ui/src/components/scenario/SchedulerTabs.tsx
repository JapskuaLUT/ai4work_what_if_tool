// src/components/scenario/SchedulerTabs.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
    { label: "Comparison", path: "/scheduler/compare", value: "compare" },
    { label: "Scenario 1", path: "/scheduler/1", value: "1" },
    { label: "Scenario 2", path: "/scheduler/2", value: "2" }
];

export function SchedulerTabs() {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab based on the path
    const match = location.pathname.match(/^\/scheduler\/(compare|\d+)/);
    const activeValue = match?.[1] ?? "";

    return (
        <Tabs
            value={activeValue}
            onValueChange={(v) => {
                const tab = tabs.find((t) => t.value === v);
                if (tab) navigate(tab.path);
            }}
            className="mt-4"
        >
            <TabsList>
                {tabs.map(({ label, value }) => (
                    <TabsTrigger key={value} value={value}>
                        {label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
