# Base image with Python 3.7
FROM python:3.7-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory inside container
WORKDIR /facerecognitionphotography-app

# Copy project files to container
COPY . /facerecognitionphotography-app

RUN apt-get update && apt-get install -y \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose the FastAPI port
EXPOSE 8080

# Start FastAPI server
CMD ["uvicorn", "main_fastapi:app", "--host", "0.0.0.0", "--port", "8080"]
