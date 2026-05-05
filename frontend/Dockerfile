FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Vite bakes VITE_* vars into the JS bundle at build time.
# Pass them as build args from docker-compose so each environment
# (dev, university machine) can set its own values without rebuilding
# from scratch each time — just rebuild with different args.
ARG VITE_API_BASE_URL=
ARG VITE_API_BASE_URL_FALLBACK=
ARG VITE_API_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_BASE_URL_FALLBACK=$VITE_API_BASE_URL_FALLBACK
ENV VITE_API_KEY=$VITE_API_KEY

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
