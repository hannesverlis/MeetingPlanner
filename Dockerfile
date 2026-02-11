FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js index.html style.css app.js ./
RUN mkdir -p data
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
