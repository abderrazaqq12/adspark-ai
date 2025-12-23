FROM node:20-bullseye

WORKDIR /app

# Ensure enough memory for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

ARG VITE_DEPLOYMENT_MODE=self-hosted
ARG VITE_REST_API_URL=/api

# EXPOSE ARGS AS ENV VARS FOR VITE
ENV VITE_DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE
ENV VITE_REST_API_URL=$VITE_REST_API_URL

COPY package.json package-lock.json ./
# Install deps (clean)
RUN npm ci

COPY . .

# Build
RUN npm run build

# This image is just a vessel for the artifact.
CMD ["echo", "Builder image done"]
