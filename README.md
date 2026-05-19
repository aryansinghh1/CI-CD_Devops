# DevOps CI/CD Pipeline Setup Guide

Complete guide to build a CI/CD pipeline with Kubernetes, Jenkins, Docker, and a monitoring stack.

## Table of Contents
1. [EC2 Setup](#ec2-setup)
2. [System Configuration](#system-configuration)
3. [Container Runtime and Kubernetes](#container-runtime-and-kubernetes)
4. [Jenkins CI/CD](#jenkins-cicd)
5. [Monitoring](#monitoring)
6. [Kubernetes Dashboard](#kubernetes-dashboard)
7. [Final Result](#final-result)
8. [Troubleshooting](#troubleshooting)

---

## EC2 Setup

### Step 1: Create EC2 Instance Using Terraform

```hcl
provider "aws" {
  region  = "us-east-1"
  profile = "default"
}

resource "aws_instance" "devops-instance" {
  ami           = "your-ami"
  instance_type = "m7i-flex.large"

  tags = {
    Name = "dev-ops"
  }
}
```
- terraform init
- terraform plan
- terraform apply

Create an Ubuntu EC2 instance with these specifications:
- OS: Ubuntu
- RAM: 8 GB
- Storage: 50 GB

Purpose: Host the Kubernetes cluster, Jenkins CI/CD, and your application.

### Step 2: Configure Security Group

Open the following ports:

| Port | Service | Purpose |
|------|---------|---------|
| 22 | SSH | Remote access |
| 8080 | Jenkins | Jenkins UI |
| 30000-32767 | Kubernetes NodePort | App access |
| 3000 | Grafana | Monitoring dashboard |
| 9090 | Prometheus | Metrics storage |

Purpose: Allow external access to Jenkins, deployed apps, and monitoring dashboards.

### Step 3: Connect to EC2

```bash
ssh -i key.pem ubuntu@EC2-IP
```

---

## System Configuration

### Step 4: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

Purpose: Ensure the latest packages and avoid compatibility issues.

### Step 5: Install Docker

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

After running these commands:
- Log out and log in again to apply group changes.
- Verify installation: `docker --version`

Purpose: Build and run container images.

### Step 6: Disable Swap (Required for Kubernetes)

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

Purpose: Kubernetes scheduler requires swap to be disabled.

### Step 7: Enable Kernel Modules

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter
```

Purpose: Required for container networking.

### Step 8: Configure Sysctl

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward                = 1
EOF

sudo sysctl --system
```

Purpose: Enable network packet forwarding for Kubernetes.

---

## Container Runtime and Kubernetes

### Step 9: Install containerd

containerd is the official container runtime (Docker runtime is deprecated in Kubernetes).

```bash
sudo apt install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
```

Edit the config file:

```bash
sudo nano /etc/containerd/config.toml
```

Find and set:

```txt
SystemdCgroup = true
```

Restart containerd:

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
```

### Step 10: Install Kubernetes (kubeadm, kubelet, kubectl)

```bash
sudo apt install -y apt-transport-https ca-certificates curl

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | \
sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

### Step 11: Initialize Kubernetes Cluster

```bash
sudo kubeadm init --cri-socket=unix:///run/containerd/containerd.sock
```

Purpose: Create Kubernetes control plane.

### Step 12: Configure kubectl

```bash
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### Step 13: Install Network Plugin (Calico)

```bash
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml
```

Purpose: Enable pod-to-pod networking.

### Step 14: Allow Pods on Single Node

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

Purpose: Allow scheduling pods on the control plane (single-node cluster).

### Step 15: Verify Kubernetes Cluster

```bash
kubectl get nodes
kubectl get pods -A
```

Verify that nodes show status as `Ready`.

---

## Jenkins CI/CD

### Step 16: Install Java (Required for Jenkins)

```bash
sudo apt update
sudo apt install fontconfig openjdk-21-jre
java -version
```

### Step 17: Install Jenkins

Add Jenkins repository:

```bash
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key

echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update
sudo apt install jenkins
```

Start Jenkins:

```bash
sudo systemctl enable jenkins
sudo systemctl start jenkins
```

Give Jenkins access to Kubernetes:

```bash
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp /etc/kubernetes/admin.conf /var/lib/jenkins/.kube/config
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube
```

Add Jenkins to Docker group:

```bash
sudo usermod -aG docker jenkins
```

Enable Docker login for Jenkins:

```bash
sudo su - jenkins
docker login
exit
```

Restart Jenkins:

```bash
sudo systemctl restart jenkins
```

### Step 18: Access Jenkins

- Open browser: `http://EC2-IP:8080`
- Get initial password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### Step 19: Configure Jenkins

Install these plugins:
- GitHub Integration
- Docker Pipeline
- Kubernetes CLI
- Pipeline Stage View

### Step 20: Create Jenkins Pipeline

Create a new Pipeline job with this Jenkinsfile:

```groovy
pipeline {
    agent any

    environment {
        IMAGE_NAME = "aryansinghh1/devops-project"
        TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Clone Code') {
            steps {
                git 'https://github.com/aryansinghh1/CI-CD_Devops.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$TAG .'
            }
        }

        stage('Push to DockerHub') {
            steps {
                sh 'docker push $IMAGE_NAME:$TAG'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                # Replace image in deployment.yaml
                sed -i "s|image: .*|image: $IMAGE_NAME:$TAG|g" deployment.yaml

                # Apply k8s configs
                kubectl apply -f deployment.yaml
                kubectl apply -f service.yaml
                kubectl apply -f monitor.yaml
                '''
            }
        }
    }
}
```

Pipeline flow:
1. Clone GitHub repository
2. Build Docker image
3. Push image to Docker Hub
4. Deploy to Kubernetes

### Step 21: Configure GitHub Webhook

In your GitHub repository settings, add a webhook:
- Payload URL: `http://EC2-IP:8080/github-webhook/`
- Content type: `application/json`
- Events: `Push events`

Purpose: Automatically trigger Jenkins pipeline on every code push.

---

## Monitoring

### Step 22: Install Prometheus and Grafana

Install Helm:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Add Prometheus Helm repository:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Install monitoring stack:

```bash
helm install monitoring prometheus-community/kube-prometheus-stack
```

### Step 23: Access Grafana

Expose Grafana service:

```bash
kubectl patch svc monitoring-grafana -p '{"spec": {"type": "NodePort"}}'
kubectl get svc monitoring-grafana
```

- Open browser: `http://EC2-IP:<PORT>`
- Get admin password:

```bash
kubectl get secret monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```

### Step 24: Access Prometheus

Expose Prometheus service:

```bash
kubectl patch svc monitoring-kube-prometheus-prometheus -p '{"spec": {"type": "NodePort"}}'
```

### Step 25: Add Application Metrics

In your Node.js application:
- Add `/metrics` endpoint.
- Install `prom-client` package.

Purpose: Expose application-level metrics to Prometheus.

### Step 26: Create ServiceMonitor

Create file `servicemonitor.yaml`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: devops-project-monitor
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      app: devops-project
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

Apply it:

```bash
kubectl apply -f servicemonitor.yaml
```

### Step 27: Verify Monitoring

- Go to Prometheus web UI.
- Navigate to `Status -> Targets`.
- Verify your application appears with status `UP`.

---

## Kubernetes Dashboard

### Step 28: Install Kubernetes Dashboard

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
```

### Step 29: Create Admin User

Create file `dashboard-admin.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: admin-user
    namespace: kubernetes-dashboard
```

Apply it:

```bash
kubectl apply -f dashboard-admin.yaml
```

### Step 30: Get Login Token

```bash
kubectl -n kubernetes-dashboard create token admin-user
```

Save this token, you will need it for login.

### Step 31: Expose Dashboard

```bash
kubectl patch svc kubernetes-dashboard -n kubernetes-dashboard \
-p '{"spec": {"type": "NodePort"}}'
```

### Step 32: Get Dashboard Port

```bash
kubectl get svc -n kubernetes-dashboard
```

Look for `kubernetes-dashboard` and note port mapping (for example, `443:32XXX/TCP`).

### Step 33: Open Dashboard and Login

- Open browser: `https://EC2-IP:<NODEPORT>`
- Important: Use `https` (not `http`).
- Select `Token` authentication method.
- Paste token from Step 30.

---

## Final Result

- CI/CD Pipeline: GitHub -> Jenkins -> Kubernetes
- Containerized deployment: Docker images built and deployed
- Automated deployment: GitHub webhook triggers Jenkins
- Monitoring: Prometheus and Grafana collecting metrics
- Custom metrics: Application-level metrics exposed
- Dashboard: Kubernetes Dashboard for cluster management

---

## Troubleshooting

- Kubernetes nodes not ready: Check whether `containerd` service is running.
- Jenkins cannot access Kubernetes: Verify `/var/lib/jenkins/.kube/config` exists and permissions are correct.
- Docker push fails: Ensure `docker login` is completed and image name is correct.
- Monitoring shows no data: Check that ServiceMonitor labels match deployment labels.
