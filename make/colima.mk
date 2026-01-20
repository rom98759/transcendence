colima-dev:
ifeq ($(COLIMA), true)
	@echo "Checking Colima status..."
	@echo "Checking Colima status and mounts..."
	@if ! colima list 2>/dev/null | grep -q "Running"; then \
		echo "Starting Colima with mount $(PROJECT_PATH)"; \
		colima start --arch aarch64 --mount "$(PROJECT_PATH):w" --vm-type vz; \
	else \
		echo "Colima is running, checking mounts..."; \
		if ! grep -q "$(PROJECT_PATH)" ~/.colima/default/colima.yaml; then \
			echo "Mount missing, restarting Colima with correct mount..."; \
			colima stop; \
			colima start --arch aarch64 --mount "$(PROJECT_PATH):w" --vm-type vz; \
		else \
			echo "Mount already configured: $(PROJECT_PATH)"; \
		fi; \
	fi
endif

colima:
	@echo "system is : $(OS)"
ifeq ($(COLIMA), true)
	colima start --arch aarch64 --mount $(VOLUMES_PATH):w --vm-type vz
endif
