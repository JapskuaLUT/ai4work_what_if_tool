// ui/src/components/results/AIExplanationBox.tsx

import { Plan, CourseworkPlan, StressPlan } from "@/types/builder";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

type AIExplanationBoxProps = {
    plan: Plan;
};

export function AIExplanationBox({ plan }: AIExplanationBoxProps) {
    const isCourseworkPlan = plan.kind === "coursework";
    const courseworkPlan = plan as CourseworkPlan;
    const stressPlan = plan as StressPlan;

    // Generate explanation for coursework plans
    const generateCourseworkExplanation = () => {
        const feasibleCount = courseworkPlan.scenarios.filter(
            (s) => s.output?.status === "feasible"
        ).length;
        const infeasibleCount = courseworkPlan.scenarios.length - feasibleCount;

        // Find a feasible scenario ID for recommendation
        const feasibleScenario = courseworkPlan.scenarios.find(
            (s) => s.output?.status === "feasible"
        );
        const recommendedScenarioId =
            feasibleScenario?.scenarioId ||
            (courseworkPlan.scenarios.length > 0
                ? courseworkPlan.scenarios[0].scenarioId
                : 1);

        if (feasibleCount === 0) {
            return (
                <>
                    <h3 className="font-medium text-lg mb-2">AI Analysis</h3>
                    <p className="mb-2">
                        All scenarios are{" "}
                        <span className="font-semibold text-red-600">
                            infeasible
                        </span>{" "}
                        with the current constraints. Consider relaxing some
                        constraints to create a viable schedule.
                    </p>
                    <p>Common issues:</p>
                    <ul className="list-disc ml-5 mt-1 text-gray-700 dark:text-gray-300">
                        <li>Too many tasks scheduled in a single day</li>
                        <li>
                            Scheduling conflicts between lectures and other
                            activities
                        </li>
                        <li>
                            Insufficient free time or breaks between activities
                        </li>
                    </ul>
                </>
            );
        } else if (infeasibleCount === 0) {
            return (
                <>
                    <h3 className="font-medium text-lg mb-2">AI Analysis</h3>
                    <p className="mb-2">
                        All scenarios are{" "}
                        <span className="font-semibold text-green-600">
                            feasible
                        </span>{" "}
                        and meet the given constraints. Scenario{" "}
                        {recommendedScenarioId} appears to have the most
                        balanced distribution of tasks throughout the week.
                    </p>
                    <p>
                        Recommendation: Review Scenario {recommendedScenarioId}{" "}
                        for the most efficient schedule.
                    </p>
                </>
            );
        } else {
            return (
                <>
                    <h3 className="font-medium text-lg mb-2">AI Analysis</h3>
                    <p className="mb-2">
                        {feasibleCount} out of {courseworkPlan.scenarios.length}{" "}
                        scenarios are{" "}
                        <span className="font-semibold text-green-600">
                            feasible
                        </span>
                        . Scenario {recommendedScenarioId} appears to be the
                        most promising with a balanced workload distribution.
                    </p>
                    <p>
                        Consider reviewing the infeasible scenarios to
                        understand what constraints are causing conflicts.
                    </p>
                </>
            );
        }
    };

    // Generate explanation for stress plans
    const generateStressExplanation = () => {
        const manageable = stressPlan.scenarios.filter(
            (s) => s.output.stress_metrics.predicted_next_week.average < 7
        ).length;
        const highStress = stressPlan.scenarios.length - manageable;

        // Find the scenario with the lowest stress increase (or highest decrease)
        let bestScenario = stressPlan.scenarios[0];
        let lowestStressChange =
            bestScenario.output.stress_metrics.predicted_next_week.average -
            bestScenario.output.stress_metrics.current_week.average;

        stressPlan.scenarios.forEach((scenario) => {
            const stressChange =
                scenario.output.stress_metrics.predicted_next_week.average -
                scenario.output.stress_metrics.current_week.average;
            if (stressChange < lowestStressChange) {
                lowestStressChange = stressChange;
                bestScenario = scenario;
            }
        });

        if (manageable === 0) {
            return (
                <>
                    <h3 className="font-medium text-lg mb-2">
                        AI Stress Analysis
                    </h3>
                    <p className="mb-2">
                        All scenarios show{" "}
                        <span className="font-semibold text-red-600">
                            high stress levels
                        </span>{" "}
                        for the upcoming week. This indicates potential burnout
                        risk if the current workload continues.
                    </p>
                    <p className="mb-2">
                        Consider redistributing workload or extending deadlines
                        where possible.
                    </p>
                    <p>Recommended actions:</p>
                    <ul className="list-disc ml-5 mt-1 text-gray-700 dark:text-gray-300">
                        <li>
                            Prioritize essential tasks and postpone non-critical
                            ones
                        </li>
                        <li>
                            Reach out for assistance or delegate tasks where
                            appropriate
                        </li>
                        <li>
                            Schedule dedicated breaks and self-care activities
                        </li>
                    </ul>
                </>
            );
        } else if (highStress === 0) {
            return (
                <>
                    <h3 className="font-medium text-lg mb-2">
                        AI Stress Analysis
                    </h3>
                    <p className="mb-2">
                        All scenarios show{" "}
                        <span className="font-semibold text-green-600">
                            manageable stress levels
                        </span>{" "}
                        for the upcoming week. Scenario{" "}
                        {bestScenario.scenarioId} shows the best stress trend
                        with a
                        {lowestStressChange <= 0
                            ? " decrease"
                            : " minimal increase"}{" "}
                        in stress levels.
                    </p>
                    <p>
                        The current workload appears sustainable, but continue
                        monitoring stress levels in future weeks.
                    </p>
                </>
            );
        } else {
            return (
                <>
                    <h3 className="font-medium text-lg mb-2">
                        AI Stress Analysis
                    </h3>
                    <p className="mb-2">
                        {manageable} out of {stressPlan.scenarios.length}{" "}
                        scenarios show{" "}
                        <span className="font-semibold text-green-600">
                            manageable stress levels
                        </span>
                        . Scenario {bestScenario.scenarioId} appears to be the
                        most promising with the lowest stress increase.
                    </p>
                    <p className="mb-2">
                        Consider reviewing high-stress scenarios to identify
                        specific stressors that could be mitigated.
                    </p>
                    <p>
                        Recommendation: Focus on the approach in Scenario{" "}
                        {bestScenario.scenarioId} to manage workload
                        effectively.
                    </p>
                </>
            );
        }
    };

    return (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 flex space-x-4">
                <div className="flex-shrink-0">
                    <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                        <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    </div>
                </div>
                <div className="flex-grow">
                    {isCourseworkPlan
                        ? generateCourseworkExplanation()
                        : generateStressExplanation()}
                </div>
            </CardContent>
        </Card>
    );
}
