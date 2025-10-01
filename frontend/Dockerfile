FROM nginx:stable-alpine AS base
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ./public /usr/share/nginx/html
EXPOSE 80 