// Test script to create and analyze a realistic educational stress scenario
import testData from "./test_simulation_realistic.json";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function testRealisticScenario() {
    console.log("🧪 Testing Realistic Educational Stress Scenario\n");
    console.log("=" .repeat(80));

    try {
        // 1. Create the simulation
        console.log("\n📤 Sending simulation request...");
        const createResponse = await fetch(`${BACKEND_URL}/api/simulations/education/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(testData),
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create simulation: ${createResponse.statusText}`);
        }

        const createResult = await createResponse.json();
        console.log(`✅ Simulation created with ID: ${createResult.caseId}`);

        // 2. Retrieve the full results
        console.log("\n📥 Retrieving simulation results...");
        const getResponse = await fetch(
            `${BACKEND_URL}/api/simulations/education/${createResult.caseId}`
        );

        if (!getResponse.ok) {
            throw new Error(`Failed to retrieve simulation: ${getResponse.statusText}`);
        }

        const simulation = await getResponse.json();
        console.log(`✅ Retrieved simulation: ${simulation.name}\n`);

        // 3. Analyze and compare scenarios
        console.log("=" .repeat(80));
        console.log("📊 SCENARIO COMPARISON");
        console.log("=" .repeat(80));

        const scenarioNames: Record<string, string> = {
            adjustment_1: "Minimal Adjustment",
            adjustment_2: "Balanced Redistribution",
            adjustment_3: "Aggressive Optimization",
            adjustment_4: "Extension-Based",
        };

        for (const scenario of simulation.week_schedules) {
            console.log(`\n${scenarioNames[scenario.adjustment_id]} (${scenario.adjustment_id})`);
            console.log("-".repeat(80));

            // Calculate metrics
            const adjustedWeeks = scenario.week_schedules.filter((w: any) => w.adjusted);
            const totalWeeks = scenario.week_schedules.length;

            let totalStress = 0;
            let peakStress = 0;
            let totalOriginalHomework = 0;
            let totalAdjustedHomework = 0;

            for (const week of scenario.week_schedules) {
                if (week.stress_metrics) {
                    totalStress += week.stress_metrics.average_stress;
                    peakStress = Math.max(peakStress, week.stress_metrics.maximum_stress);
                }

                if (week.optimization_changes) {
                    totalOriginalHomework += week.optimization_changes.original_homework_hours;
                    totalAdjustedHomework += week.homework_hours;
                } else {
                    totalOriginalHomework += week.homework_hours;
                    totalAdjustedHomework += week.homework_hours;
                }
            }

            const avgStress = totalStress / totalWeeks;
            const hoursReduced = totalOriginalHomework - totalAdjustedHomework;

            console.log(`  Adjusted Weeks:    ${adjustedWeeks.length}/${totalWeeks}`);
            console.log(`  Average Stress:    ${avgStress.toFixed(1)}`);
            console.log(`  Peak Stress:       ${peakStress.toFixed(1)}`);
            console.log(`  Homework Hours:    ${totalOriginalHomework} → ${totalAdjustedHomework} (${hoursReduced > 0 ? '-' : '+'}${Math.abs(hoursReduced)} redistributed)`);

            // Show which weeks were adjusted
            if (adjustedWeeks.length > 0) {
                const adjustedWeekNumbers = adjustedWeeks.map((w: any) => w.week_number).join(", ");
                console.log(`  Adjusted in weeks: ${adjustedWeekNumbers}`);
            }
        }

        console.log("\n" + "=".repeat(80));
        console.log("📈 DETAILED WEEK-BY-WEEK COMPARISON");
        console.log("=".repeat(80));

        // Show a few example weeks to see the differences
        const exampleWeeks = [3, 5, 8, 10, 14]; // High-stress weeks

        for (const weekNum of exampleWeeks) {
            console.log(`\nWeek ${weekNum}:`);
            console.log("-".repeat(80));

            for (const scenario of simulation.week_schedules) {
                const week = scenario.week_schedules.find((w: any) => w.week_number === weekNum);
                if (week) {
                    const name = scenarioNames[scenario.adjustment_id];
                    const homework = week.homework_hours;
                    const original = week.optimization_changes?.original_homework_hours || homework;
                    const avgStress = week.stress_metrics?.average_stress?.toFixed(1) || "N/A";
                    const maxStress = week.stress_metrics?.maximum_stress?.toFixed(1) || "N/A";
                    const adjusted = week.adjusted ? "✓" : " ";

                    const homeworkChange = original !== homework ? ` (was ${original}h)` : "";

                    console.log(
                        `  [${adjusted}] ${name.padEnd(25)} | ` +
                        `Homework: ${homework}h${homeworkChange.padEnd(12)} | ` +
                        `Stress: ${avgStress} avg, ${maxStress} max`
                    );
                }
            }
        }

        console.log("\n" + "=".repeat(80));
        console.log("✅ Test completed successfully!");
        console.log("=".repeat(80));

    } catch (error) {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    }
}

// Run the test
testRealisticScenario();
