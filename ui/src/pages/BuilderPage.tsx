// ui/src/pages/BuilderPage.tsx
// src/pages/BuilderPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const presets = {
    coursework: {
        lectures: "Mon 9–11, Wed 14–16",
        projectHours: "4",
        constraints:
            "Max 6h/day\nAt least one free afternoon\nNo overlapping tasks"
    },
    "teaching-plan": {
        lectures: "Tue 10–12, Thu 13–15",
        projectHours: "6",
        constraints: "Max 5h/day\nTwo free afternoons\nNo overlapping tasks"
    }
};

export default function BuilderPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        lectures: "",
        projectHours: "",
        constraints: ""
    });

    // Prepopulate form when projectId changes
    useEffect(() => {
        if (projectId && presets[projectId as keyof typeof presets]) {
            setForm(presets[projectId as keyof typeof presets]);
        }
    }, [projectId]);

    const handleChange = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        console.log("Submitting scenario:", form);
        // Simulate navigation to comparison view
        navigate("/scheduler/compare");
    };

    const label =
        projectId === "coursework"
            ? "Coursework Scheduling"
            : "Teaching Plan Scheduling";

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">{label} – Scenario Builder</h1>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">
                        Lectures
                    </label>
                    <Input
                        placeholder="e.g. Mon 9–11, Wed 14–16"
                        value={form.lectures}
                        onChange={(e) =>
                            handleChange("lectures", e.target.value)
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">
                        Project Hours
                    </label>
                    <Input
                        placeholder="e.g. 4"
                        value={form.projectHours}
                        onChange={(e) =>
                            handleChange("projectHours", e.target.value)
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">
                        Constraints
                    </label>
                    <Textarea
                        placeholder="Max 6h/day, No overlapping tasks..."
                        value={form.constraints}
                        onChange={(e) =>
                            handleChange("constraints", e.target.value)
                        }
                    />
                </div>

                <div className="pt-4">
                    <Button onClick={handleSubmit}>Generate & Compare</Button>
                </div>
            </div>
        </div>
    );
}
