FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend ./

USER node
EXPOSE 10000

CMD ["node", "server.js"]
