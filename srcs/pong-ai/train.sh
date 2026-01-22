#!/bin/bash

# Training script for Pong AI
# Usage: ./train.sh [timesteps] [save_path]

TIMESTEPS=${1:-100000}
SAVE_PATH=${2:-models/pong_moderate}

echo "🎮 Starting Pong AI Training"
echo "📊 Total timesteps: $TIMESTEPS"
echo "💾 Save path: $SAVE_PATH"
echo "🎯 Target: Game service at http://game-service:3003"
echo ""

python3 train_ppo.py \
    --timesteps $TIMESTEPS \
    --save-path $SAVE_PATH \
    --use-gpu

echo ""
echo "✅ Training complete!"
echo "📁 Model saved to: $SAVE_PATH"
