FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils curl ca-certificates \
    && ARCH=$(uname -m) \
    && if [ "$ARCH" = "aarch64" ]; then SUFFIX="aarch64-unknown-linux-musl"; else SUFFIX="x86_64-unknown-linux-gnu"; fi \
    && curl -sSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic@0.15.0/tectonic-0.15.0-${SUFFIX}.tar.gz" \
       | tar xz -C /usr/local/bin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
