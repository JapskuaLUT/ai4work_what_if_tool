import { test, expect } from "bun:test";
import fs from "fs/promises";
import path from "path";
const API_URL = "https://backend.localhost";
const SIMULATIONS_ENDPOINT = `${API_URL}/api/simulations`;

test("POST /api/simulations - Create a new simulation set", async () => {
    const dataPath = path.resolve(__dirname, "data", "testSimulationSet.json");
    const testData = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    // Ensure a unique caseId for each test run to avoid conflicts
    testData.caseId = `test-case-${Date.now()}`;

    const postResponse = await fetch(SIMULATIONS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
        tls: { rejectUnauthorized: false }
    });

    expect(postResponse.status).toBe(201);
    const postBody = await postResponse.json();
    expect(postBody.caseId).toBe(testData.caseId); // Expect the same caseId back
});

test("GET /api/simulations/:caseId - Retrieve a simulation set", async () => {
    // First, create a simulation set to retrieve
    const dataPath = path.resolve(__dirname, "data", "testSimulationSet.json");
    const testData = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    const caseId = `test-case-${Date.now()}-get`; // Unique caseId for GET test

    testData.caseId = caseId; // Set the caseId for the POST request

    const postResponse = await fetch(SIMULATIONS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
        tls: { rejectUnauthorized: false }
    });

    expect(postResponse.status).toBe(201); // Ensure POST was successful

    // Now, retrieve it
    const getResponse = await fetch(`${SIMULATIONS_ENDPOINT}/${caseId}`, {
        tls: { rejectUnauthorized: false }
    });
    expect(getResponse.status).toBe(200);
    const getBody = await getResponse.json();
    expect(getBody.caseId).toBe(caseId);
    expect(getBody.name).toBe(testData.name);
    expect(getBody.scenarios.length).toBe(testData.scenarios.length);

    // Deep check a scenario and its nested data
    const originalScenario1 = testData.scenarios[0];
    const retrievedScenario1 = getBody.scenarios.find(
        (s: any) => s.scenarioId === originalScenario1.scenarioId
    );
    expect(retrievedScenario1).toBeDefined();
    expect(retrievedScenario1.input.courseName).toBe(
        originalScenario1.input.courseName
    );
    expect(retrievedScenario1.assignments.length).toBe(
        originalScenario1.assignments.length
    );
    expect(retrievedScenario1.stressMetrics.currentWeekAverage).toBe(
        originalScenario1.stressMetrics.currentWeekAverage
    );
});
