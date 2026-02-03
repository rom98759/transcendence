#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Paths
# ============================================================

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CERTS_DIR="$BASE_DIR/certs"
CA_DIR="$CERTS_DIR/ca"
SERVICES_DIR="$CERTS_DIR/services"
NGINX_DIR="$CERTS_DIR/nginx"

OPENSSL_CONF="$BASE_DIR/openssl.cnf"

# ============================================================
# Services 
# ============================================================

SERVICES=(
  user-service
  auth-service
  blockchain-service
  game-service
  api-gateway
)

# ============================================================
# Helpers
# ============================================================

generate_san_conf() {
  local name="$1"
  local file="$2"

  cat > "$file" <<EOF
[ req ]
prompt = no
distinguished_name = dn
req_extensions = req_ext

[ dn ]
CN = ${name}

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = ${name}
EOF
  if [ "$name" = "blockchain-service" ]; then
    echo "DNS.2 = localhost" >> "$file"
  fi
}

# ============================================================
# CA
# ============================================================

if [ ! -f "$CA_DIR/ca.crt" ]; then
  echo "▶ Generating internal CA"
  mkdir -p "$CA_DIR"

  openssl genrsa -out "$CA_DIR/ca.key" 4096

  openssl req -x509 -new -nodes \
    -key "$CA_DIR/ca.key" \
    -sha256 -days 3650 \
    -out "$CA_DIR/ca.crt" \
    -subj "/C=FR/O=transcendence/OU=ca/CN=transcendence-ca" \
    -extensions ca_ext \
    -config "$OPENSSL_CONF"
else
  echo "✔ CA already exists"
fi

# ============================================================
# Services certificates
# ============================================================

echo "▶ Generating service certificates"

mkdir -p "$SERVICES_DIR"

for SERVICE in "${SERVICES[@]}"; do
  echo "  • $SERVICE"

  DIR="$SERVICES_DIR/$SERVICE"
  mkdir -p "$DIR"

  SAN_CONF="$DIR/san.cnf"

  generate_san_conf "$SERVICE" "$SAN_CONF"

  openssl genrsa -out "$DIR/$SERVICE.key" 2048

  openssl req -new \
    -key "$DIR/$SERVICE.key" \
    -out "$DIR/$SERVICE.csr" \
    -config "$SAN_CONF"
  
  EXT="client_server_ext"
  # if [ "$SERVICE" = "api-gateway" ]; then
  #   EXT="client_server_ext"
  # fi
  openssl x509 -req \
    -in "$DIR/$SERVICE.csr" \
    -CA "$CA_DIR/ca.crt" \
    -CAkey "$CA_DIR/ca.key" \
    -CAcreateserial \
    -out "$DIR/$SERVICE.crt" \
    -days 825 \
    -sha256 \
    -extfile "$OPENSSL_CONF" \
    -extensions "$EXT"
done

# ============================================================
# Nginx (client + server)
# ============================================================

echo "▶ Generating nginx-proxy certificate"

mkdir -p "$NGINX_DIR"
SAN_CONF="$NGINX_DIR/san.cnf"

cat > "$SAN_CONF" <<EOF
[ req ]
prompt = no
distinguished_name = dn
req_extensions = req_ext

[ dn ]
CN = nginx-proxy

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = nginx-proxy
DNS.2 = localhost
EOF

openssl genrsa -out "$NGINX_DIR/nginx.key" 2048

openssl req -new \
  -key "$NGINX_DIR/nginx.key" \
  -out "$NGINX_DIR/nginx.csr" \
  -config "$SAN_CONF"

openssl x509 -req \
  -in "$NGINX_DIR/nginx.csr" \
  -CA "$CA_DIR/ca.crt" \
  -CAkey "$CA_DIR/ca.key" \
  -CAcreateserial \
  -out "$NGINX_DIR/nginx.crt" \
  -days 825 \
  -sha256 \
  -extfile "$OPENSSL_CONF" \
  -extensions client_server_ext

# ============================================================
# Permissions
# ============================================================

# On s'assure que les dossiers sont traversables
find "$CERTS_DIR" -type d -exec chmod 755 {} +

# On rend les certificats et clés lisibles par les conteneurs
find "$CERTS_DIR" -type f -name "*.crt" -exec chmod 644 {} +
find "$CERTS_DIR" -type f -name "*.csr" -exec chmod 644 {} +
find "$CERTS_DIR" -type f -name "*.key" -exec chmod 644 {} +

echo "✔ All certificates successfully generated with correct permissions"
