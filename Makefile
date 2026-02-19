include make/config.mk

# === Global ===

all : volumes certs colima build
	npm i
	$(D_COMPOSE) up -d

dev: volumes colima-dev build-dev
	$(D_COMPOSE_DEV) up -d

volumes:
	@mkdir -p $(DATABASE_PATH) $(UPLOADS_PATH)
	@chmod -R 777 $(VOLUMES_PATH)
# 	@docker run --rm -v $(VOLUMES_PATH):/tmp/v alpine sh -c "chown -R 1001:204 /tmp/v && chmod -R 775 /tmp/v"

start :
	$(D_COMPOSE) start
start-dev :
	$(D_COMPOSE_DEV) start
stop :
	$(D_COMPOSE) stop
down :
	$(D_COMPOSE) down
down-dev :
	$(D_COMPOSE_DEV) down

# --- Env files ---
envs:
	@echo "Creating .env files from examples…"
	@secret=$$(openssl rand -hex 32); \
	for f in srcs/.env*.example; do \
		envfile=$${f%.example}; \
		if [ ! -f "$$envfile" ]; then \
			cp "$$f" "$$envfile"; \
			echo "Copied $$f → $$envfile"; \
		else \
			echo "$$envfile already exists"; \
		fi; \
		if grep -q '^JWT_SECRET=' "$$envfile" 2>/dev/null; then \
			sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$$secret|" "$$envfile"; \
			rm -f "$$envfile.bak"; \
			echo "Set JWT_SECRET in $$envfile"; \
		fi; \
	done; \
	echo "JWT_SECRET applied to all files"

# --- Certificats mTLS---
CERTS_DIR=./make/scripts/certs/certs

certs:
	@if [ ! -d "$(CERTS_DIR)/ca" ]; then \
		echo "Generating TLS certificates..."; \
		cd make/scripts/certs && ./generate_certs.sh; \
	else \
		echo "TLS certificates already exist"; \
	fi

include make/colima.mk

# --- Linters ---

format-check:
	npx prettier . --check
format:
	npx prettier . --write

format-core:
	npx prettier srcs/shared --write
format-user:
	npx prettier srcs/users --write

lint:
	npx eslint .
lint-fix:
	npx eslint . --fix

# === Services ===

# --- Install workspaces ---

install:
	npm i

# --- Builds Images ---
nginx:
	$(D_COMPOSE) up -d --build $(PROXY_SERVICE_NAME)
redis:
	$(D_COMPOSE) up -d --build $(REDIS_SERVICE_NAME)
api:
	$(D_COMPOSE) up -d --build $(API_GATEWAY_NAME)
auth:
	$(D_COMPOSE) up -d --build $(AUTH_SERVICE_NAME)
user:
	$(D_COMPOSE) build $(UM_SERVICE_NAME)
	$(D_COMPOSE) up -d $(UM_SERVICE_NAME)
game:
	$(D_COMPOSE) up -d --build $(GAME_SERVICE_NAME)
block:
	$(D_COMPOSE) up -d --build $(BK_SERVICE_NAME)
pong-ai:
	$(D_COMPOSE) up -d --build $(PONG_AI_SERVICE_NAME)
build:
	$(D_COMPOSE) build
build-dev:
	$(D_COMPOSE_DEV) build

# --- Test ---
test: certs test-user

test-coverage: certs test-coverage-user

test-user:
	$(COMPOSE_CMD) \
		-f srcs/docker-compose.yml \
		-f srcs/docker-compose.test.yml \
		run --rm test-runner

test-pong-ai:
	@echo "Running pong-ai tests..."
	@cd srcs/pong-ai && \
		python3 -m venv .venv 2>/dev/null || true && \
		. .venv/bin/activate && \
		pip install -q pytest numpy && \
		python -m pytest test_pong_server.py -v

test-coverage-user:
	$(COMPOSE_CMD) \
		-f srcs/docker-compose.yml \
		-f srcs/docker-compose.test.yml \
		run --rm test-runner \
		sh -lc "npm ci && npm run test:coverage --workspace srcs/users"

test-block:
	@gnome-terminal -- bash -c "cd srcs/blockchain/src/SmartContract && npx hardhat node" &
	sleep 2
	@echo "Deploying contract and updating .env.test.blockchain..."
	@cd srcs/blockchain/src/SmartContract && \
	CONTRACT_OUTPUT=$$(npx hardhat ignition deploy ignition/modules/GameStorage.ts --network localhost 2>&1) && \
	echo "$$CONTRACT_OUTPUT" && \
	CONTRACT_ADDR=$$(echo "$$CONTRACT_OUTPUT" | grep -o '0x[a-fA-F0-9]\{40\}' | tail -1) && \
	if [ -n "$$CONTRACT_ADDR" ]; then \
		echo "Contract deployed at: $$CONTRACT_ADDR" && \
		sed -i "s/^GAME_STORAGE_ADDRESS=.*/GAME_STORAGE_ADDRESS=$$CONTRACT_ADDR/" ../../.env.test.blockchain && \
		echo "Updated .env.test.blockchain with address: $$CONTRACT_ADDR"; \
	else \
		echo "Failed to extract contract address"; \
	fi
	sleep 2
	cd srcs/blockchain && \
	npm run dev:b

# --- DB ---
redis-cli:
	$(CONTAINER_CMD) exec -it $(REDIS_SERVICE_NAME) redis-cli


dev-nginx: install
	npm run dev --workspace proxy-service

# --- Shell access ---

# generic rule : replace % with service name
shell-%:
	$(CONTAINER_CMD) logs -f $*
shell-nginx:
	$(CONTAINER_CMD) exec -it $(PROXY_SERVICE_NAME) /bin/sh
shell-redis:
	$(CONTAINER_CMD) exec -it $(REDIS_SERVICE_NAME) /bin/sh
shell-api:
	$(CONTAINER_CMD) exec -it $(API_GATEWAY_NAME) /bin/sh
shell-auth:
	$(CONTAINER_CMD) exec -it $(AUTH_SERVICE_NAME) /bin/sh
shell-user:
	$(CONTAINER_CMD) exec -it $(UM_SERVICE_NAME) /bin/sh
shell-game:
	$(CONTAINER_CMD) exec -it $(GAME_SERVICE_NAME) /bin/sh
shell-block:
	$(CONTAINER_CMD) exec -it $(BK_SERVICE_NAME) /bin/sh
shell-pong-ai:
	$(CONTAINER_CMD) exec -it $(PONG_AI_SERVICE_NAME) /bin/sh

# --- Logs and status ---

prisma-user:
	$(CONTAINER_CMD) exec -it $(USER_SERVICE_NAME) npx prisma studio --browser none

logs:
	$(D_COMPOSE) logs -f
# generic rule : replace % with service name
logs-%:
	$(CONTAINER_CMD) logs -f $*

logs-nginx:
	$(CONTAINER_CMD) logs -f $(PROXY_SERVICE_NAME)
logs-redis:
	$(CONTAINER_CMD) logs -f $(REDIS_SERVICE_NAME)
logs-api:
	$(CONTAINER_CMD) logs -f $(API_GATEWAY_NAME)
logs-auth:
	$(CONTAINER_CMD) logs -f $(AUTH_SERVICE_NAME)
logs-user:
	$(CONTAINER_CMD) logs -f $(UM_SERVICE_NAME)
logs-game:
	$(CONTAINER_CMD) logs -f $(GAME_SERVICE_NAME)
logs-block:
	$(CONTAINER_CMD) logs -f $(BK_SERVICE_NAME)
logs-pong-ai:
	$(CONTAINER_CMD) logs -f $(PONG_AI_SERVICE_NAME)

show:
	$(CONTAINER_CMD) images
	$(CONTAINER_CMD) volume ls
	$(CONTAINER_CMD) ps
	$(CONTAINER_CMD) network ls

# === Clean ===

# Clean WITHOUT deleting images → SAFE
# xargs -r won't launch next command list is empty
clean:
	@echo "Stopping and removing containers…"
	@$(CONTAINER_CMD) ps -q | xargs -r $(CONTAINER_CMD) stop
	@$(CONTAINER_CMD) ps -aq | xargs -r $(CONTAINER_CMD) rm -f
	@echo "Pruning unused resources (SAFE)…"
	$(CONTAINER_CMD) system prune -f

# Clean contents but preserve structure
fclean: clean
	@echo "Removing volumes and networks…"
	-$(CONTAINER_CMD) volume prune -f
	-$(CONTAINER_CMD) network prune -f
	@echo "Cleaning volume contents with Docker"
	rm -rf ./srcs/shared/core/dist
	rm -rf ./srcs/users/dist
	rm -rf $(VOLUMES_PATH)
	@echo "Volume folder cleaned (structure preserved)"

re : fclean all

clean-pack:
	@echo "Cleaning local build artifacts..."
	npm run clean
	npm cache clean --force

# Hard reset - deletes everything including folder
reset-hard: clean clean-pack
	@echo "WARNING: Full reset including Colima stop"
	@if [ -n "$$($(CONTAINER_CMD) -q)" ]; then $(CONTAINER_CMD) rmi -f $$($(CONTAINER_CMD) images -q); else echo "No images to remove."; fi
	-$(CONTAINER_CMD) volume prune -f
	-$(CONTAINER_CMD) network prune -f
	-$(CONTAINER_CMD) system prune -a --volumes --force
ifeq ($(OS), Darwin)
ifneq ($(CHIP), arm64)
	@echo "Stopping Colima…"
	-colima stop
endif
endif
	rm -rf $(VOLUMES_PATH)
	@echo "Remove certificates"
	rm -rf make/scripts/certs/certs

.PHONY : all clean fclean re check format core build volumes setup core nginx redis api auth user stop down logs logs-nginx logs-api logs-auth colima colima-dev
