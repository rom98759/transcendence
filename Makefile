include make/config.mk

# === Global ===

all : volumes colima build
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

# --- Installs Node ---
install:
	npm i

# --- Builds Node ---
build-core: install
	$(N_BUILD_WK)/shared/core
build-nginx: install
	$(N_BUILD_WK)/nginx
build-auth: install
	$(N_BUILD_WK)/auth
build-game: install
	$(N_BUILD_WK)/game
build-block: install
	$(N_BUILD_WK)/blockchain
build-api: install
	$(N_BUILD_WK)/gateway
build-user: install
	$(N_BUILD_WK)/users
# 	cd srcs/users && npm install && npm run build

# --- Builds Images ---
nginx: build-core
	$(D_COMPOSE) up -d --build $(PROXY_SERVICE_NAME)
redis: build-core
	$(D_COMPOSE) up -d --build $(REDIS_SERVICE_NAME)
api: build-core build-api
	$(D_COMPOSE) up -d --build $(API_GATEWAY_NAME)
auth: build-core build-auth
	$(D_COMPOSE) up -d --build $(AUTH_SERVICE_NAME)
user: build-core build-user
	$(D_COMPOSE) build $(UM_SERVICE_NAME)
	$(D_COMPOSE) up -d $(UM_SERVICE_NAME)
game: build-core build-game
	$(D_COMPOSE) up -d --build $(GAME_SERVICE_NAME)
block: build-core build-block
	$(D_COMPOSE) up -d --build $(BK_SERVICE_NAME)
build: build-core
	$(D_COMPOSE) build
build-dev: build-core
	$(D_COMPOSE_DEV) build

# --- Test ---
test: install test-user

test-coverage: install test-coverage-user

test-user: build-core
	cd srcs/users && npm install && npx vitest run --config vite.config.mjs
test-coverage-user: build-core
	cd srcs/users && npx vitest run --coverage --config vite.config.mjs

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
	$(CONTAINER_CMD) exec -it $(USER_SERVICE_NAME) /bin/sh
shell-game:
	$(CONTAINER_CMD) exec -it $(GAME_SERVICE_NAME) /bin/sh
shell-block:
	$(CONTAINER_CMD) exec -it $(BK_SERVICE_NAME) /bin/sh

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

clean-packages:
	@echo "Cleaning local build artifacts..."
	npm run clean

# Hard reset - deletes everything including folder
reset-hard: clean clean-packages
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

.PHONY : all clean fclean re check format core build volumes setup core nginx redis api auth user stop down logs logs-nginx logs-api logs-auth colima colima-dev
