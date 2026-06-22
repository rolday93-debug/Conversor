# Usar una imagen base de Ubuntu con Node.js
FROM ubuntu:22.04

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js (versión LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Instalar Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Instalar rust365
RUN cargo install rust365

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos del proyecto
COPY package*.json ./
RUN npm install

COPY . .

# Puerto expuesto
EXPOSE 10000

# Comando de inicio
CMD ["node", "server.js"]