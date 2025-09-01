import { Plan } from "@/types/builder";

const BACKEND_API_URL =
    import.meta.env.VITE_BACKEND_API_URL || "https://backend.localhost/api";

export async function getSimulationSet(caseId: string): Promise<Plan> {
    const response = await fetch(`${BACKEND_API_URL}/simulations/${caseId}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}
