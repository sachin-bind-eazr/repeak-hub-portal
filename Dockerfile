# web-hub-portal — Next.js 14 (App Router), Node runtime in local Docker.
# Calls the backend directly (cross-origin, CORS is open) via
# NEXT_PUBLIC_API_BASE_URL — no server-side rewrite proxy, so no
# API_BASE_URL build-arg dance is needed for that. NEXT_PUBLIC_* vars
# ARE inlined at build time though (Next bakes them into the client
# bundle), so the destination-portal base URLs must be build args.
#
# Port: container binds 4006 (package.json `next start -p 4006`).

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_OM_BASE_URL=http://localhost:4004
ENV NEXT_PUBLIC_OM_BASE_URL=$NEXT_PUBLIC_OM_BASE_URL
ARG NEXT_PUBLIC_CM_BASE_URL=http://localhost:4005
ENV NEXT_PUBLIC_CM_BASE_URL=$NEXT_PUBLIC_CM_BASE_URL
ARG NEXT_PUBLIC_BM_BASE_URL=http://localhost:3399
ENV NEXT_PUBLIC_BM_BASE_URL=$NEXT_PUBLIC_BM_BASE_URL

RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs

EXPOSE 4006
CMD ["npm", "start"]
