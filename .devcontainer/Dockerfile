FROM mcr.microsoft.com/devcontainers/rust:1-bookworm

# Install Tauri dependencies
# Note: libwebkit2gtk-4.1-dev is for Tauri v2 on newer Debian/Ubuntu
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    xauth \
    xvfb \
    xdg-utils \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*
