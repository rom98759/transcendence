# FROM node:18-alpine AS builder
# WORKDIR /build
# COPY html/index.ts html/tsconfig.json ./
# RUN npm install -g typescript && tsc index.ts --outFile app.js --target ES2017 --lib ES2017,DOM
# npm install --save-dev esbuild
# FROM nginx:alpine
# RUN rm /etc/nginx/conf.d/default.conf
# COPY nginx.conf /etc/nginx/nginx.conf
# COPY conf.d/ /etc/nginx/conf.d/
# COPY html/index.html /usr/share/nginx/html/
# COPY --from=builder /build/app.js /usr/share/nginx/html/
# EXPOSE 80 443
# CMD ["nginx", "-g", "daemon off;"]

FROM node:18-alpine AS builder
WORKDIR /build
COPY ./html ./
# Use esbuild to bundle TypeScript for the browser
# RUN npx esbuild index.ts --bundle --outfile=app.js --format=iife --target=es2017
RUN npm install -g typescript && tsc index.ts --outFile app.js --target ES2017 --lib ES2017,DOM

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY ./html /usr/share/nginx/html/

# COPY html/index.html /usr/share/nginx/html/
COPY --from=builder /build/app.js /usr/share/nginx/html/
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
