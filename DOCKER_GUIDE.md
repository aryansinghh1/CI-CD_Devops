# Build, Run & Push Docker Image to Docker Hub

## Prerequisites
- Docker installed on your machine
- Docker Hub account (free at https://hub.docker.com)
- Git repo set up with your code

---

## Step 1: Create Docker Hub Account & Repository

1. Go to https://hub.docker.com and sign up (or login)
2. Click **Create Repository**
3. Repository name: `devops-project` (or any name)
4. Set to **Public** (optional, can be private)
5. Click **Create**

---

## Step 2: Login to Docker Hub from Terminal

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

To verify login:
```bash
docker info
```

---

## Step 3: Build Docker Image Locally

Navigate to your project directory and run:

```bash
docker build -t devops-project:v1.0 .
```

**Breakdown:**
- `docker build` = Build image
- `-t devops-project:v1.0` = Tag with name:version
- `.` = Use Dockerfile in current directory

**To verify the image was built:**
```bash
docker images
```

---

## Step 4: Run Docker Container Locally (Test)

```bash
docker run -p 3000:3000 devops-project:v1.0
```

**Breakdown:**
- `docker run` = Create and run container
- `-p 3000:3000` = Map port 3000 (host) to 3000 (container)
- `devops-project:v1.0` = Image name:version

**Test the app:**
- Open browser: http://localhost:3000
- Should see: "App is running"
- Health check: http://localhost:3000/health
- CI/CD page: http://localhost:3000/cicd

**To stop container:**
```bash
docker stop <container_id>
```

Get container ID:
```bash
docker ps
```

---

## Step 5: Tag Image for Docker Hub

Before pushing, tag the image with your Docker Hub username:

```bash
docker tag devops-project:v1.0 YOUR_DOCKER_USERNAME/devops-project:v1.0
```

Example:
```bash
docker tag devops-project:v1.0 aryansinghh1/devops-project:v1.0
```

Also tag as `latest`:
```bash
docker tag devops-project:v1.0 YOUR_DOCKER_USERNAME/devops-project:latest
```

---

## Step 6: Push to Docker Hub

```bash
docker push YOUR_DOCKER_USERNAME/devops-project:v1.0
```

Example:
```bash
docker push aryansinghh1/devops-project:v1.0
```

Push `latest` tag:
```bash
docker push YOUR_DOCKER_USERNAME/devops-project:latest
```

**Verify push:**
- Go to https://hub.docker.com
- Your image should be visible in your repositories

---

## Complete Workflow (All Commands)

```bash
# 1. Build image
docker build -t devops-project:v1.0 .

# 2. Run locally to test
docker run -p 3000:3000 devops-project:v1.0

# 3. Stop container (Ctrl+C or in another terminal)
docker ps
docker stop <container_id>

# 4. Login to Docker Hub
docker login

# 5. Tag for Docker Hub
docker tag devops-project:v1.0 YOUR_DOCKER_USERNAME/devops-project:v1.0
docker tag devops-project:v1.0 YOUR_DOCKER_USERNAME/devops-project:latest

# 6. Push to Docker Hub
docker push YOUR_DOCKER_USERNAME/devops-project:v1.0
docker push YOUR_DOCKER_USERNAME/devops-project:latest
```

---

## Run from Docker Hub (Anyone can use it)

After pushing, anyone can run your image:

```bash
docker run -p 3000:3000 YOUR_DOCKER_USERNAME/devops-project:latest
```

---

## Useful Docker Commands

```bash
# View all images
docker images

# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Remove image
docker rmi IMAGE_NAME:TAG

# Remove container
docker rm CONTAINER_ID

# View image details
docker inspect IMAGE_NAME:TAG

# View container logs
docker logs CONTAINER_ID

# Run container in detached mode (background)
docker run -d -p 3000:3000 devops-project:v1.0

# Execute command in running container
docker exec -it CONTAINER_ID /bin/sh

# Build with custom Dockerfile
docker build -f path/to/Dockerfile -t image-name:tag .

# Build with build arguments
docker build --build-arg NODE_ENV=production -t image-name:tag .
```

---

## Troubleshooting

### Docker login failed
```bash
# Clear credentials
docker logout

# Try login again
docker login
```

### Image push fails (401 Unauthorized)
- Make sure you're logged in: `docker login`
- Verify tag format: `username/repo-name:tag`

### Container won't start
```bash
docker logs CONTAINER_ID
```

### Port already in use
```bash
# Use different port
docker run -p 8000:3000 devops-project:v1.0
# Access on http://localhost:8000
```

---

## Next Steps (After Docker Hub)

- Set up GitHub Actions to auto-build and push on commit
- Deploy using Kubernetes
- Set up Prometheus/Grafana monitoring
- Configure Jenkins for CI/CD
