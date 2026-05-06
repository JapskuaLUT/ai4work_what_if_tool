// ui/src/types/yard.ts
//
// Mirrors backend/src/types/yard.ts. Kept manually in sync; if the simulator
// schema grows, regenerate from typeScheme_ExportData.json on both sides.

export type EOrderActionType = "Loading" | "Unloading";
export type EOrderState = "Unhandled" | "Incomplete" | "Completed";
export type TerminalTyp =
    | "CheckIn"
    | "CheckOut"
    | "Waagenterminal"
    | "Schrankenterminal";

export interface Order {
    offsetMinutes: number;
    licensePlate: string;
    action: EOrderActionType;
    quantityKg: number;
    material: string;
}

export interface TimeEntry {
    Location: string;
    Action: string;
    Start: string; // "HH:MM:SS"
    End: string;
    Duration: string;
    Remark: string;
}

export interface OrderMeasurementSummary {
    WaitingTime: string;
    DrivingTime: string;
    OrderState: EOrderState;
}

export interface OrderMeasurement {
    TimeEntries: TimeEntry[];
    OrderIdent: string;
    ProcessIdent: string;
    Summary: OrderMeasurementSummary;
}

export interface MeasurementSummary {
    OrdersOverall: number;
    OrdersUnhandled: number;
    OrdersIncomplete: number;
    OrdersCompleted: number;
}

export interface ExportMeasurement {
    Summary: MeasurementSummary;
    Measurements: OrderMeasurement[];
}

// Yard graph (subset — only the bits the UI displays)
export interface EntityBase {
    Id: string;
    Name: string;
    Description: string;
    Costs_Seconds: number;
    Actions: string;
}

export interface Crossing extends EntityBase {
    PlanDuration: string;
    MaxOccupancy: number;
}
export interface ParkingArea extends EntityBase {
    ParkingDuration: string;
    Capacity: number;
}
export interface Scale extends EntityBase {
    WeighingDuration: string;
}
export interface Storage extends EntityBase {
    Capacity: number;
    Stock: number;
    MaterialId: string;
    Loading_PerSecond: number;
    Unloading_PerSecond: number;
}
export interface Terminal extends EntityBase {
    ProcessingDuration: string;
    Typ: TerminalTyp;
}
export interface Street extends EntityBase {
    DrivingDuration: string;
    MaxOccupancy: number;
    ID_From: string;
    ID_To: string;
    Cost_Seconds: number;
}

export interface YardDesignData {
    Entities: {
        Crossings: Crossing[];
        ParkingAreas: ParkingArea[];
        Scales: Scale[];
        Storages: Storage[];
        Terminals: Terminal[];
    };
    Streets: Street[];
}

// Derived metrics (computed by backend, returned in summary_metrics)
export interface SecondsStats {
    total: number;
    avg: number;
    max: number;
    p95: number;
}
export interface OrderCounts {
    overall: number;
    completed: number;
    incomplete: number;
    unhandled: number;
}
export interface ThroughputStats {
    orders_per_hour: number;
    first_order_min: number;
    last_completion_min: number;
}
export interface BottleneckEntry {
    entity: string;
    type:
        | "Terminal"
        | "Storage"
        | "Scale"
        | "ParkingArea"
        | "Crossing"
        | "Street"
        | "Unknown";
    max_concurrent: number;
    max_occupancy: number;
    queue_score: number;
}
export interface YardRunSummaryMetrics {
    orders: OrderCounts;
    waiting_seconds: SecondsStats;
    driving_seconds: SecondsStats;
    throughput: ThroughputStats;
    bottlenecks: BottleneckEntry[];
}

// API response shapes
export interface YardRunSummary {
    run_id: string;
    label: string;
    description: string | null;
    simulated_at: string | null;
    yard_hash: string | null;
    processes_hash: string | null;
    orders_hash: string | null;
    summary_metrics: YardRunSummaryMetrics;
}

export interface YardSimulationOverview {
    case_id: string;
    name: string;
    description: string | null;
    yard_image_path: string | null;
    yard_structure: YardDesignData | null;
    yard_hash: string | null;
    processes_hash: string | null;
    selected_run_id: string | null;
    selected_at: string | null;
    metadata: Record<string, unknown>;
    runs: YardRunSummary[];
}

export interface YardRunDetail extends YardRunSummary {
    case_id: string;
    orders: Order[];
    measurements: ExportMeasurement;
    yard_structure: YardDesignData | null;
}

export interface OccupancyTimelinePoint {
    t_seconds: number;
    count: number;
}
export interface OccupancyTimeline {
    case_id: string;
    run_id: string;
    entity: string;
    max_occupancy: number;
    points: OccupancyTimelinePoint[];
}

// ---------------------------------------------------------------------------
// Improvement proposals
// ---------------------------------------------------------------------------

export type ProposalChange =
    | {
          kind: "capacity";
          entity: string;
          from: number;
          to: number;
          note?: string;
      }
    | {
          kind: "stagger_orders";
          description: string;
          target_arrivals_per_min?: number;
          spread_window_min?: number;
          note?: string;
      }
    | {
          kind: "reroute";
          material: string;
          from_storage: string;
          to_storage: string;
          note?: string;
      }
    | {
          kind: "add_entity";
          entity_type:
              | "Terminal"
              | "ParkingArea"
              | "Scale"
              | "Storage"
              | "Crossing";
          terminal_typ?:
              | "CheckIn"
              | "CheckOut"
              | "Waagenterminal"
              | "Schrankenterminal";
          name: string;
          connects?: string[];
          note?: string;
      };

export type ProposalSource = "ai" | "manual";

export interface YardProposal {
    id: number;
    case_id: string;
    target_run_id: string | null;
    title: string;
    summary: string;
    target_bottleneck: string | null;
    changes: ProposalChange[];
    expected_impact: string | null;
    risks: string | null;
    source: ProposalSource;
    sent_to_simulator_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface YardProposalCreateInput {
    target_run_id?: string | null;
    title: string;
    summary: string;
    target_bottleneck?: string | null;
    changes: ProposalChange[];
    expected_impact?: string | null;
    risks?: string | null;
    source?: ProposalSource;
}

export interface ProposalValidation {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * A proposal that has been generated by the LLM but not yet persisted.
 * Carries a stable client-side id so localStorage can keep them across
 * refreshes. `validation` is populated after the user clicks Save (or
 * if the server rejects it).
 */
export interface YardProposalDraft extends YardProposalCreateInput {
    draft_id: string;
    created_at: string;
    last_validation?: ProposalValidation;
}
