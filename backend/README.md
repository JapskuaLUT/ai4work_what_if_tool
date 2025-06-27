# Backend Documentation

This document provides an overview of the backend service for the What-If Component project. It details the functionality, structure, and how to run the service.

## Table of Contents

-   [Backend Documentation](#backend-documentation)

    -   [Table of Contents](#table-of-contents)

    -   [Overview](#overview)

    -   [Technology Stack](#technology-stack)

    -   [Project Structure](#project-structure)

    -   [API Endpoints](#api-endpoints)

        -   [Health Check](#health-check)
        -   [Metrics](#metrics)
        -   [Simulations](#simulations)

    -   [Database](#database)

    -   [Running with Docker](#running-with-docker)

## Overview

The backend is a crucial component of the What-If tool, responsible for managing simulation data. It's built with Elysia.js, a high-performance web framework, and is designed to be run in a Docker container. The backend provides API endpoints for creating and retrieving simulation sets, which include detailed scenarios, assignments, and stress metrics related to course planning.

## Technology Stack

-   **Framework**: [Elysia.js](https://elysiajs.com/)
-   **Database**: PostgreSQL
-   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
-   **Runtime**: [Bun](https://bun.sh/)
-   **Containerization**: Docker
-   **API Documentation**: Swagger
-   **Metrics**: Prometheus
-   **Logging**: Winston & Morgan

## Project Structure

The backend code is organized into the following main directories:

-   `src/`: Contains the main source code.

    -   `db/`: Database connection and schema definitions.
    -   `logging/`: Logging configuration.
    -   `metrics/`: Prometheus metrics setup.
    -   `middleware/`: Custom middleware (if any).
    -   `routes/`: API route definitions.
    -   `tests/`: Test files.

-   `public/`: Static files served by the application.

-   `Dockerfile`: Instructions for building the Docker image.

-   `package.json`: Project dependencies and scripts.

## API Endpoints

All API endpoints are available under the `/api` prefix. The backend also provides a Swagger UI for interactive API documentation, which can be accessed at `/swagger`.

### Health Check

-   **GET** `/api/health`

    -   **Description**: Checks the health of the service.

    -   **Response**:

        ```json
        {
            "status": "ok",
            "timestamp": "2023-10-27T10:00:00Z"
        }
        ```

### Metrics

-   **GET** `/api/metrics`

    -   **Description**: Exposes Prometheus metrics for monitoring.
    -   **Response**: A string in Prometheus format.

### Simulations

-   **POST** `/api/simulations`

    -   **Description**: Creates a new simulation set. The request body should contain the simulation data, including scenarios, assignments, and stress metrics.

    -   **Response**:

        ```json
        {
            "caseId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
            "resultsUrl": "https://app.localhost/results/a1b2c3d4-e5f6-7890-1234-567890abcdef"
        }
        ```

-   **GET** `/api/simulations/{caseId}`

    -   **Description**: Retrieves a complete simulation set by its unique `caseId`.
    -   **Response**: A JSON object containing the full simulation set data.

## Database

The backend uses a PostgreSQL database to store simulation data. The database schema is managed by Drizzle ORM and is defined in `src/db/schema.ts`. The schema includes tables for `simulation_sets`, `scenarios`, `assignments`, and `stress_metrics`.

## Running with Docker

The entire application is designed to be run with Docker. The `docker-compose.yml` file in the root of the project orchestrates the backend service along with other services like the UI, database, and a Traefik proxy.

The backend service is defined in the `docker-compose.yml` file with the service name `backend`. It uses a custom-built Docker image (`whatif-backend:dev`) and is connected to the `what_if_network`.

Key aspects of the Docker configuration include:

-   **Volume Mounting**: The local `./backend` directory is mounted into the container at `/usr/src/app`, allowing for live code changes without rebuilding the image.
-   **Environment Variables**: The `JWT_SECRET`, `SERVER_URL`, and `DATABASE_URL` are passed to the container as environment variables.
-   **Networking**: The service is connected to a custom bridge network (`what_if_network`) to communicate with other services.
-   **Traefik Integration**: Labels are used to configure Traefik as a reverse proxy, making the backend accessible at `https://backend.localhost`.
