# UI Documentation

This document provides an overview of the UI for the What-If tool, its interaction with the backend, and how it operates within the project's Docker environment.

## UI Functionality and Structure

The UI is a modern web application built with **React** and **Vite**. It serves as the primary interface for users to interact with the What-If simulation tool.

### Key Technologies

-   **React**: A JavaScript library for building user interfaces.
-   **Vite**: A fast build tool and development server for modern web projects.
-   **React Router**: For handling client-side routing and navigation.
-   **Bun**: Used as the package manager and development server runner.

### Application Structure

The main entry point for the application is `src/App.tsx`. It sets up the routing for the different pages of the application. The application is structured into several pages, each serving a specific purpose:

-   `/`: **Main Page** - The landing page of the application.
-   `/builder/:projectId`: **Builder Page** - Allows users to create and configure new simulation scenarios.
-   `/results/:projectId`: **Schedule Results Page** - Displays the results of a simulation.
-   `/compare`: **Compare Page** - Provides a feature to compare different simulation results.
-   `/test/ollama`: **Ollama Page** - A test page for integrating with the Ollama service.

The UI components are organized logically within the `src/components` directory, with shared components, page-specific components, and UI elements separated for clarity.

## Backend Interaction

The UI communicates with a backend service to create, retrieve, and manage simulation data. The backend is an **ElysiaJS** application that provides a RESTful API.

### Backend API Endpoints

The backend exposes several endpoints under the `/api` prefix. The most important ones for the UI are:

-   `POST /api/simulations`: This endpoint is used to create a new simulation set. The UI sends a JSON payload containing the simulation data, and the backend saves it to the database.
-   `GET /api/simulations/{caseId}`: This endpoint retrieves a specific simulation set by its `caseId`. The UI uses this to display simulation results.
-   `GET /api/health`: A health check endpoint to verify that the backend service is running.
-   `GET /api/metrics`: Exposes Prometheus metrics for monitoring.

The backend is responsible for all business logic, including data validation, storage, and retrieval. It uses a PostgreSQL database to store the simulation data.

## Docker Environment

The entire application, including the UI, backend, and other services, is designed to run in a **Docker** environment, orchestrated by `docker-compose.yml`.

### Services

The `docker-compose.yml` file defines the following services:

-   **`ui`**: This service runs the React frontend. It is configured to be accessible at `https://app.localhost`. The local `ui` directory is mounted into the container, allowing for live-reloading during development.
-   **`backend`**: This service runs the ElysiaJS backend API. It is accessible at `https://backend.localhost`. Like the UI, the local `backend` directory is mounted for development purposes.
-   **`traefik`**: A reverse proxy that manages routing and SSL for all services. It directs traffic to the appropriate service based on the hostname (e.g., `app.localhost` to the UI, `backend.localhost` to the backend).
-   **`postgres`**: The PostgreSQL database used by the backend to store data.
-   **`ollama-proxy`**: A proxy service for Ollama.

### Networking

All services are connected to a custom bridge network named `what_if_network`. This allows the services to communicate with each other by their service names. For example, the backend can connect to the database using the hostname `postgres`.

### Running in Docker

To run the UI and the entire application stack, you can use the `docker-compose up` command from the root of the project. This will build and start all the services defined in the `docker-compose.yml` file.
