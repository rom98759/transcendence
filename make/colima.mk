colima-dev:
ifeq ($(OS),Darwin)
ifneq ($(CHIP), arm64)
	@echo "Checking Colima status and mounts..."
	@if ! colima list 2>/dev/null | grep -q "Running"; then \
		echo "Starting Colima with mount $(PROJECT_PATH)"; \
		colima start --mount "$(PROJECT_PATH):w" --vm-type vz; \
	else \
		echo "Colima is running, checking mounts..."; \
		if ! colima status 2>/dev/null | grep -q "$(PROJECT_PATH)"; then \
			echo "Mount missing, restarting Colima with correct mount..."; \
			colima stop; \
			colima start --mount "$(PROJECT_PATH):w" --vm-type vz; \
		else \
			echo "Mount already configured: $(PROJECT_PATH)"; \
		fi; \
	fi
else
	@echo "Skipping Colima start: Chip is '$(OS)' (Not x386)"
endif
else
	@echo "Skipping Colima start: OS is '$(OS)' (Not Darwin)"
endif

colima:
	@echo "system is : $(OS) $(CHIP)"
ifeq ($(OS), Darwin)
ifneq ($(CHIP), arm64)
	colima start --mount $(VOLUMES_PATH):w --vm-type vz
endif
endif
