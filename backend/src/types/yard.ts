// backend/src/types/yard.ts

/**
 * Yard logistics types.
 *
 * The "Simulator export" shapes (YardSimulationExport, YardDesignData,
 * Order, Process, ExportMeasurement, ...) mirror the partner simulator's
 * SimulationExportData payload 1:1 — see
 * specifications/yard_logistics/_GeneralInfo/typeScheme_ExportData.json.
 * Field names, casing, and enum literal values are kept exactly as the
 * simulator emits them so future API integration needs no translation layer.
 *
 * The "Ingest" and "Derived" types are ours.
 */

// ---------------------------------------------------------------------------
// Enums (mirrored from typeScheme_ExportData.json)
// ---------------------------------------------------------------------------

export type EEntityAction =
    | "None"
    | "Loading"
    | "Unloading"
    | "CheckIn"
    | "CheckOut"
    | "Parking"
    | "Authenticate"
    | "Weighing"
    // The simulator concatenates multiple actions with ", " (e.g. "Loading, Unloading").
    | string;

export type TerminalTyp =
    | "CheckIn"
    | "CheckOut"
    | "Waagenterminal"
    | "Schrankenterminal";

export type EOrderActionType = "Loading" | "Unloading";

export type EOrderState = "Unhandled" | "Incomplete" | "Completed";

// ---------------------------------------------------------------------------
// Yard graph entities (mirrored)
// ---------------------------------------------------------------------------

export interface EntityBase {
    Costs_Seconds: number;
    Id: string;
    Name: string;
    Description: string;
    Actions: EEntityAction;
}

export interface Crossing extends EntityBase {
    PlanDuration: string; // "HH:MM:SS"
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

export interface EntityCollections {
    Crossings: Crossing[];
    ParkingAreas: ParkingArea[];
    Scales: Scale[];
    Storages: Storage[];
    Terminals: Terminal[];
}

export interface Street extends EntityBase {
    DrivingDuration: string;
    MaxOccupancy: number;
    ID_From: string;
    ID_To: string;
    Cost_Seconds: number;
}

export interface YardDesignData {
    Entities: EntityCollections;
    Streets: Street[];
}

// ---------------------------------------------------------------------------
// Processes & orders (mirrored)
// ---------------------------------------------------------------------------

export interface ProcessTask {
    Specifications: string[]; // entity names this task is pinned to (or empty for any)
    Action: string; // EEntityAction or "*"
    Remark: string;
}

export interface Process {
    Ident: string;
    Material: string; // material id, or "*"
    Action: string; // EOrderActionType or space-separated combination
    Remark: string;
    Tasks: ProcessTask[];
}

export interface Order {
    offsetMinutes: number;
    licensePlate: string;
    action: EOrderActionType;
    quantityKg: number;
    material: string;
}

// ---------------------------------------------------------------------------
// Measurements (mirrored)
// ---------------------------------------------------------------------------

export interface TimeEntry {
    Location: string; // entity Name (e.g. "LT010", "S3", "P010")
    Action: string; // CheckIn / Driving / Parking / Authenticate / Loading / Weighing / CheckOut / Waiting
    Start: string; // "HH:MM:SS"
    End: string;
    Duration: string;
    Remark: string;
}

export interface OrderMeasurementSummary {
    WaitingTime: string; // "HH:MM:SS"
    DrivingTime: string;
    OrderState: EOrderState;
}

export interface OrderMeasurement {
    TimeEntries: TimeEntry[];
    OrderIdent: string; // matches Order.licensePlate
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

// ---------------------------------------------------------------------------
// Top-level simulator export (mirrored)
// ---------------------------------------------------------------------------

export interface ComparisonInformation {
    YardStructure: string; // sha-256 hex
    Processes: string;
    Orders: string;
}

export interface YardSimulationExport {
    ComparisonInformation: ComparisonInformation;
    YardStructure: YardDesignData;
    Processes: Process[];
    Orders: Order[];
    Measurements: ExportMeasurement;
}

// ---------------------------------------------------------------------------
// Ingest contract (our API input)
// ---------------------------------------------------------------------------

export interface YardRunIngestInput {
    run_id: string; // e.g. "01_smooth"
    label: string; // human label, e.g. "Smooth"
    description?: string;
    simulated_at?: string; // ISO 8601, optional
    export: YardSimulationExport;
}

export interface YardSimulationIngestInput {
    name: string;
    description?: string;
    yard_image_path?: string;
    metadata?: Record<string, unknown>;
    runs: YardRunIngestInput[];
}

// ---------------------------------------------------------------------------
// Derived metrics (computed at ingest, stored in yard_runs.summary_metrics)
// ---------------------------------------------------------------------------

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
    entity: string; // entity Name (or a synthetic name for off-yard waits)
    type:
        | "Terminal"
        | "Storage"
        | "Scale"
        | "ParkingArea"
        | "Crossing"
        | "Street"
        | "ExternalWait" // Synthetic: a truck waiting *before* any entity
        //               // (simulator emits Action="Waiting" Location="").
        //               // Surfaced as one bottleneck named "(off-yard waiting)".
        | "Unknown";
    max_concurrent: number;
    max_occupancy: number;
    queue_score: number; // max_concurrent / max_occupancy
}

export interface YardRunSummaryMetrics {
    orders: OrderCounts;
    waiting_seconds: SecondsStats;
    driving_seconds: SecondsStats;
    throughput: ThroughputStats;
    bottlenecks: BottleneckEntry[]; // top-N
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface YardRunSummaryResponse {
    run_id: string;
    label: string;
    description: string | null;
    simulated_at: string | null;
    yard_hash: string | null;
    processes_hash: string | null;
    orders_hash: string | null;
    summary_metrics: YardRunSummaryMetrics;
}

export interface YardSimulationOverviewResponse {
    case_id: string;
    name: string;
    description: string | null;
    yard_image_path: string | null;
    yard_structure: YardDesignData | null;
    processes: Process[] | null;
    yard_hash: string | null;
    processes_hash: string | null;
    selected_run_id: string | null;
    selected_at: string | null;
    metadata: Record<string, unknown>;
    runs: YardRunSummaryResponse[];
}

export interface YardRunDetailResponse extends YardRunSummaryResponse {
    case_id: string;
    orders: Order[];
    measurements: ExportMeasurement;
    yard_structure: YardDesignData | null; // only set if run-level override
    processes: Process[] | null;
}

export interface OccupancyTimelinePoint {
    t_seconds: number;
    count: number;
}

export interface OccupancyTimelineResponse {
    case_id: string;
    run_id: string;
    entity: string;
    max_occupancy: number;
    points: OccupancyTimelinePoint[];
}

// ---------------------------------------------------------------------------
// Proposals — improvement suggestions over a yard simulation
// ---------------------------------------------------------------------------

/**
 * One concrete change inside a proposal. The `kind` field discriminates
 * the shape; new kinds can be added over time. The simulator-API hand-off
 * (future work) will translate these into the simulator's input format.
 */
export type ProposalChange =
    | {
          kind: "capacity";
          entity: string;        // entity Name (e.g. "P010", "B010")
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
          connects?: string[];      // street names this new entity ties into
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
    sent_to_simulator_at: string | null;   // ISO 8601
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

/** Result of validating a proposal against a yard structure. */
export interface ProposalValidation {
    valid: boolean;
    errors: string[];     // hard problems (unknown entity, bad kind)
    warnings: string[];   // soft concerns (e.g. capacity reduction below max_concurrent)
}
