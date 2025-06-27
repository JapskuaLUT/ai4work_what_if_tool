#!/bin/bash
# install_local_packages.sh
# Install the local packages (auth, backend, ui)
echo "Starting to build the docker images..."

echo "Installing packages for backend/"
cd backend
bun install
cd ..
echo "Installing packages for backend/ DONE"

echo "Installing packages for ui/"
cd ui
bun install
cd ..
echo "Installing packages for ui/ DONE"

echo "Installing all packages DONE."