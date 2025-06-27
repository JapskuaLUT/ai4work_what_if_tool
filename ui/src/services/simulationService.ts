import { Plan } from "@/types/builder";

export async function getSimulationSet(caseId: string): Promise<Plan> {
    const response = await fetch(
        `https://backend.localhost/api/simulations/${caseId}`
    );
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}
