# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime stage ---
FROM nginx:alpine
# Vite 빌드 결과를 Nginx 기본 루트로 복사
COPY --from=build /app/dist /usr/share/nginx/html
# SPA 라우팅: 존재하지 않는 경로는 index.html로
RUN printf 'try_files $uri /index.html;\n' > /etc/nginx/snippets/try_spa.conf && \
    sed -i 's|location / {|location / {\n    include /etc/nginx/snippets/try_spa.conf;|g' /etc/nginx/conf.d/default.conf
EXPOSE 80