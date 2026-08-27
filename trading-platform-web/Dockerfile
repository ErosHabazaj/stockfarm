# ---- build stage: node compiles the angular bundle ----
FROM node:24-alpine AS build
WORKDIR /app

# lockfile first so npm ci is cached until dependencies change
COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage: nginx serves the static files and proxies /api ----
FROM nginx:alpine AS runtime

# the angular build lands in dist/<project>/browser
COPY --from=build /app/dist/trading-platform-web/browser /usr/share/nginx/html
# our own server config replaces the default one
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
