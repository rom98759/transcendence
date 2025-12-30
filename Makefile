include make/config.mk

# === Global ===

all : volumes colima build
	$(D_COMPOSE) up -d

dev: volumes colima-dev
	$(D_COMPOSE_DEV) up --build -d

volumes:
	@mkdir -p $(VOLUMES_PATH)
	@mkdir -p $(UPLOADS_PATH)
	@chmod -R 777 $(VOLUMES_PATH)

start :
	$(D_COMPOSE) start
stop :
	$(D_COMPOSE) stop
down :
	$(D_COMPOSE) down
down-dev :
	$(D_COMPOSE_DEV) down

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
	cd srcs/users && npm install && npm run build

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
	$(D_COMPOSE) up -d --build $(UM_SERVICE_NAME)
game: build-core build-game
	$(D_COMPOSE) up -d --build $(GAME_SERVICE_NAME)
block: build-core build-block
	$(D_COMPOSE) up -d --build $(BK_SERVICE_NAME)
build: build-core
	$(D_COMPOSE) build

# --- Test ---
test: install test-user

test-coverage: install test-coverage-user

test-user: build-core
	cd srcs/users && npm install && npx vitest run --config vite.config.mjs
test-coverage-user: build-core
	cd srcs/users && npx vitest run --coverage --config vite.config.mjs

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
	@echo "Cleaning volume contents…"
	@if [ -d "$(VOLUMES_PATH)" ] && [ "$(VOLUMES_PATH)" != "/" ]; then \
		find $(VOLUMES_PATH) -mindepth 1 -delete || true; \
	fi
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
	@echo "Stopping Colima…"
	-colima stop
	rm -rf $(VOLUMES_PATH)
else
	rm -rf $(VOLUMES_PATH)
endif

.PHONY : all clean fclean re check format core build volumes setup core nginx redis api auth user stop down logs logs-nginx logs-api logs-auth colima colima-dev
