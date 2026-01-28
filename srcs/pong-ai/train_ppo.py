import os
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.monitor import Monitor
import numpy as np
from pong_env import PongEnv


def make_env():
    def _init():
        env = PongEnv()
        env = Monitor(env)
        return env
    return _init


def train_strong_agent(
    total_timesteps=1_000_000,
    save_path="models/pong_moderate",
    eval_episodes=10,
    use_gpu=True,
    base_url=None
):
    os.makedirs(save_path, exist_ok=True)
    os.makedirs(f"{save_path}/checkpoints", exist_ok=True)

    # Determine game service URL: CLI arg -> env var -> default
    if base_url is None:
        base_url = os.getenv("GAME_SERVICE_URL", "http://localhost:8080/api/game")

    def _make_env():
        env = PongEnv(base_url=base_url)
        return Monitor(env)

    env = DummyVecEnv([_make_env])
    eval_env = DummyVecEnv([_make_env])

    device = "cuda" if use_gpu else "cpu"

    print(f"Training on {device}")
    print(f"Game API: {base_url}")
    print(f"Steps: {total_timesteps:,}")
    print(f"Time: ~{total_timesteps // 2000} minutes")
    print("-" * 50)
    
    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,
        verbose=1,
        device=device,
        tensorboard_log=f"{save_path}/tensorboard"
    )
    
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=save_path,
        log_path=f"{save_path}/eval",
        eval_freq=5000,
        n_eval_episodes=eval_episodes,
        deterministic=True,
        render=False
    )
    
    checkpoint_callback = CheckpointCallback(
        save_freq=10000,
        save_path=f"{save_path}/checkpoints",
        name_prefix="pong_checkpoint"
    )
    
    try:
        model.learn(
            total_timesteps=total_timesteps,
            callback=[eval_callback, checkpoint_callback],
            progress_bar=True
        )
        
        model.save(f"{save_path}/pong_moderate_final")
        print(f"\nTraining complete!")
        print(f"Model saved: {save_path}/pong_moderate_final.zip")
        
    except KeyboardInterrupt:
        print("\nTraining interrupted")
        model.save(f"{save_path}/pong_moderate_interrupted")
    
    finally:
        env.close()
        eval_env.close()
    
    return model


def test_agent(model_path, episodes=5, render=True, base_url=None):
    model = PPO.load(model_path)
    if base_url is None:
        base_url = os.getenv("GAME_SERVICE_URL", "http://localhost:8080/api/game")
    env = PongEnv(base_url=base_url, render_mode="human" if render else None)
    
    total_rewards = []
    total_scores_ai = []
    total_scores_player = []
    
    print(f"\nTesting agent: {episodes} episodes")
    print("-" * 50)
    
    for episode in range(episodes):
        obs, info = env.reset()
        done = False
        episode_reward = 0
        
        while not done:
            action, _states = model.predict(obs, deterministic=True)
            obs, reward, done, truncated, info = env.step(action)
            episode_reward += reward
            
            if render:
                env.render()
        
        total_rewards.append(episode_reward)
        total_scores_ai.append(info["score_ai"])
        total_scores_player.append(info["score_player"])
        
        print(f"Episode {episode + 1}: Reward={episode_reward:.2f}, "
              f"Score AI={info['score_ai']} vs Player={info['score_player']}")
    
    env.close()
    
    print("-" * 50)
    print(f"Mean reward: {np.mean(total_rewards):.2f} ± {np.std(total_rewards):.2f}")
    print(f"Mean AI score: {np.mean(total_scores_ai):.2f}")
    print(f"Mean player score: {np.mean(total_scores_player):.2f}")
    
    win_rate = np.mean([ai > player for ai, player in zip(total_scores_ai, total_scores_player)])
    print(f"AI win rate: {win_rate * 100:.1f}%")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train or test Pong AI agent")
    parser.add_argument("--mode", choices=["train", "test"], default="train", help="Training or testing mode")
    parser.add_argument("--timesteps", type=int, default=100_000, help="Total training timesteps")
    parser.add_argument("--save-path", type=str, default="models/pong_moderate", help="Path to save model")
    parser.add_argument("--model", type=str, default="models/pong_moderate/pong_moderate_final", help="Path to load model for testing")
    parser.add_argument("--episodes", type=int, default=5, help="Number of test episodes")
    parser.add_argument("--no-render", action="store_true", help="Disable rendering during test")
    parser.add_argument("--use-gpu", action="store_true", help="Use GPU for training")
    parser.add_argument("--game-url", type=str, default=None, help="Base URL for game service (or set GAME_SERVICE_URL env var)")

    args = parser.parse_args()
    
    if args.mode == "train":
        train_strong_agent(
            total_timesteps=args.timesteps,
            save_path=args.save_path,
            use_gpu=args.use_gpu,
            base_url=args.game_url
        )
    else:
        test_agent(
            model_path=args.model,
            episodes=args.episodes,
            render=not args.no_render,
            base_url=args.game_url
        )
