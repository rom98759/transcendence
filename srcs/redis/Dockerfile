FROM redis:7-alpine

# Copy custom Redis configuration
COPY srcs/redis/redis.conf /usr/local/etc/redis/redis.conf

# Create data directory
RUN mkdir -p /data

# Expose Redis port
EXPOSE 6379

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD redis-cli ping || exit 1

# Start Redis with custom config
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
