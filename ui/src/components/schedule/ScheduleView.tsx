// ui/src/components/schedule/ScheduleView.tsx
import { Scenario } from "@/types";

interface ScheduleViewProps {
    scenario: Scenario;
}

export function ScheduleView({ scenario }: ScheduleViewProps) {
    return (
        <div className="border rounded-lg p-4 h-full overflow-auto">
            <h2 className="font-semibold mb-2">Schedule</h2>
            {scenario.output.status === "infeasible" ? (
                <p className="text-red-500">This scenario is infeasible.</p>
            ) : (
                scenario.output.schedule?.map((day, idx) => (
                    <div key={idx} className="mb-4">
                        <strong>{day.day}</strong>
                        <ul className="ml-4 list-disc text-sm">
                            {day.timeBlocks.map((block, i) => (
                                <li key={i}>
                                    {block.time} – {block.task}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
        </div>
    );
}
