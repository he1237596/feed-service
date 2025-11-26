#!/bin/bash

# Deployment script for Piral Feed Service
set -e

# Configuration
SERVICE_NAME="piral-feed-service"
DEPLOY_USER=${DEPLOY_USER:-deploy}
DEPLOY_HOST=${DEPLOY_HOST:-localhost}
DEPLOY_PATH=${DEPLOY_PATH:-/opt/piral-feed-service}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-}
ENVIRONMENT=${ENVIRONMENT:-production}

echo "🚀 Deploying Piral Feed Service to $ENVIRONMENT..."

# Build and push Docker image (if registry is configured)
if [ ! -z "$DOCKER_REGISTRY" ]; then
    echo "📦 Building and pushing Docker image..."
    
    # Build with registry tag
    docker build -t $DOCKER_REGISTRY/$SERVICE_NAME:latest .
    docker build -t $DOCKER_REGISTRY/$SERVICE_NAME:$(git rev-parse --short HEAD) .
    
    # Push images
    docker push $DOCKER_REGISTRY/$SERVICE_NAME:latest
    docker push $DOCKER_REGISTRY/$SERVICE_NAME:$(git rev-parse --short HEAD)
fi

# Deploy to remote server
echo "🌐 Deploying to remote server..."

# Create deployment script
cat > /tmp/deploy-remote.sh << 'EOF'
#!/bin/bash
set -e

SERVICE_NAME="piral-feed-service"
DEPLOY_PATH="/opt/piral-feed-service"

# Create deployment directory if it doesn't exist
sudo mkdir -p $DEPLOY_PATH
sudo chown $USER:$USER $DEPLOY_PATH

cd $DEPLOY_PATH

# Pull latest image
if [ ! -z "$1" ]; then
    docker pull $1/$SERVICE_NAME:latest
else
    docker pull piral-feed-service:latest
fi

# Stop existing service
docker-compose down || true

# Update docker-compose.yml
cat > docker-compose.yml << 'EOC'
version: '3.8'

services:
  feed-service:
    image: $1/$SERVICE_NAME:latest
    container_name: piral-feed-service
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_PATH=/app/data/feed-service.db
      - STORAGE_PATH=/app/storage
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN:-*}
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=100
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./storage:/app/storage
      - ./logs:/app/logs
    networks:
      - feed-network

networks:
  feed-network:
    driver: bridge
EOC

# Start service
docker-compose up -d

echo "🎉 Deployment completed!"
EOF

# Make deployment script executable
chmod +x /tmp/deploy-remote.sh

# Copy and execute on remote server
if [ "$DEPLOY_HOST" != "localhost" ]; then
    scp /tmp/deploy-remote.sh $DEPLOY_USER@$DEPLOY_HOST:/tmp/
    ssh $DEPLOY_USER@$DEPLOY_HOST "/tmp/deploy-remote.sh $DOCKER_REGISTRY"
else
    /tmp/deploy-remote.sh $DOCKER_REGISTRY
fi

# Cleanup
rm /tmp/deploy-remote.sh

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Service should be available at: http://$DEPLOY_HOST:3000"
echo "📊 Health check: http://$DEPLOY_HOST:3000/health"
echo ""
echo "📝 To view logs:"
echo "   ssh $DEPLOY_USER@$DEPLOY_HOST 'docker logs -f piral-feed-service'"