# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY yarn.lock* ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

# Production stage
FROM node:22-alpine

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./
COPY yarn.lock* ./

RUN yarn install --frozen-lockfile --production

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

RUN mkdir -p /app/.voltagent && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3141

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
