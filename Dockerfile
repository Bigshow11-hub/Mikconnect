FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate --schema=backend/prisma/schema.prisma
RUN npm run build -w backend && npm run build -w frontend

FROM node:20-alpine AS backend
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "dist/index.js"]

FROM nginx:alpine AS frontend
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/public/_redirects /usr/share/nginx/html/_redirects
COPY frontend/public/_headers /usr/share/nginx/html/_headers
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
