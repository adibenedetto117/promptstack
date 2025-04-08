FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    git \
    wget \
    curl \
    build-essential \
    cmake \
    ninja-build \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install llama.cpp requirements
RUN pip3 install --no-cache-dir \
    fastapi \
    uvicorn \
    pydantic \
    python-dotenv \
    numpy

# Install llama-cpp-python with CPU optimizations
RUN CMAKE_ARGS="-DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS" pip3 install --no-cache-dir llama-cpp-python

# Create app directory
WORKDIR /app

# Download the model (you will need to copy this to the container or mount it as a volume)
# This step is done during runtime to avoid large Docker images

# Create static directory
RUN mkdir -p /app/static

# Copy application files
COPY app.py /app/
COPY .env /app/
COPY static/ /app/static/

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]