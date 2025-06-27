#!/bin/bash
# build_docker_images.sh
# Builds the docker images for the whatif
echo "Removing dangling images first..."
docker rmi -f $(docker images -f "dangling=true" -q)
echo "Removing dangling images done."

echo "Starting to build the docker images..."

echo "building whatif-backend:dev..."
docker build -f backend/Dockerfile -t whatif-backend:dev backend/
echo "whatif-backend:dev DONE"

echo "building whatif-ui:dev..."
docker build -f ui/Dockerfile -t whatif-ui:dev ui/
echo "whatif-ui:dev DONE"

echo "building whatif-ollama-proxy:dev..."
docker build -f ollama_proxy/Dockerfile -t whatif-ollama-proxy:dev ollama_proxy/
echo "whatif-ollama-proxy:dev DONE"