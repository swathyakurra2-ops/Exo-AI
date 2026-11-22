# Stage 1: Builder
# Start from the lightweight Nginx image and name this build stage "builder".
FROM nginx:alpine AS builder

# Remove the default Nginx site configuration so it does not conflict with the custom one.
RUN rm /etc/nginx/conf.d/default.conf

# Copy the project's custom Nginx configuration into the image.
COPY nginx.conf /etc/nginx/conf.d/

# Copy the single HTML file, which contains the page's embedded CSS and JavaScript.
COPY index.html /usr/share/nginx/html/

# Stage 2: Production image
# Start a fresh lightweight Nginx image for the final production container.
FROM nginx:alpine

# Copy the custom Nginx configuration from the builder stage into the final image.
COPY --from=builder /etc/nginx/conf.d /etc/nginx/conf.d
# Copy the static website files from the builder stage into the final image.
COPY --from=builder /usr/share/nginx/html /usr/share/nginx/html

# Document that the container serves HTTP traffic on port 80.
EXPOSE 80

# Run Nginx in the foreground so the container stays running.
CMD ["nginx", "-g", "daemon off;"]
