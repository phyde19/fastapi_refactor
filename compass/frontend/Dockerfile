FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

EXPOSE 3000

CMD ["sh", "-c", "npm install && exec npm run dev -- -H 0.0.0.0 -p 3000"]


FROM node:20-alpine AS build

WORKDIR /app

ARG NEXT_PUBLIC_COMPASS_API_BASE_URL
ENV NEXT_PUBLIC_COMPASS_API_BASE_URL=$NEXT_PUBLIC_COMPASS_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build


FROM node:20-alpine AS prod

WORKDIR /app

ENV NODE_ENV=production

RUN adduser -D appuser

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next

USER appuser

EXPOSE 3000

CMD ["npm", "start"]
