import { test, expect } from "bun:test";
import fs from "fs/promises";
import path from "path";
const API_URL = "https://backend.localhost";
const SIMULATIONS_ENDPOINT = `${API_URL}/api/simulations`;

test("POST /api/simulations - Create a new simulation set", async () => {
    const dataPath = path.resolve(__dirname, "data", "testSimulationSet.json");
    const testData = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    const case_id = `test-case-${Date.now()}`;
    testData.case_id = case_id;

    const response = await fetch(SIMULATIONS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
        tls: {
            rejectUnauthorized: false
        }
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.case_id).toBe(case_id);
});

test("GET /api/simulations/:case_id - Retrieve a simulation set", async () => {
    // First, create a simulation set to retrieve
    const dataPath = path.resolve(__dirname, "data", "testSimulationSet.json");
    const testData = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    const case_id = `test-case-${Date.now()}`;
    testData.case_id = case_id;

    await fetch(SIMULATIONS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
        tls: {
            rejectUnauthorized: false
        }
    });

    // Now, retrieve it
    const response = await fetch(`${SIMULATIONS_ENDPOINT}/${case_id}`, {
        tls: {
            rejectUnauthorized: false
        }
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.case_id).toBe(case_id);
    expect(body.name).toBe(testData.name);
    expect(body.scenarios.length).toBe(testData.scenarios.length);
});
