🟢 STEP 1: Create EC2 Instance
✔ Ubuntu EC2
 ✔ 8 GB RAM, 50 GB Storage
👉 Purpose:
 This machine will host:
Kubernetes cluster
Jenkins CI/CD
Your application

🟢 STEP 2: Configure Security Group
Open ports:
22 → SSH
8080 → Jenkins
30000–32767 → Kubernetes NodePort
3000 → Grafana
9090 → Prometheus
👉 Purpose:
 Allows external access to:
Jenkins UI
Deployed app
Monitoring dashboards

🟢 STEP 3: Connect to EC2
ssh -i key.pem ubuntu@EC2-IP

🟢 STEP 4: Update System
sudo apt update && sudo apt upgrade -y
👉 Purpose:
 Ensures latest packages and avoids compatibility issues

🟢 STEP 5: Install Docker
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
👉 Logout & login again
docker --version
👉 Purpose:
 Used to build and run container images

🟢 STEP 6: Disable Swap (Required for Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
👉 Purpose:
 Kubernetes scheduler requires swap to be disabled

🟢 STEP 7: Enable Kernel Modules
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter
👉 Purpose:
 Required for container networking

🟢 STEP 8: Configure Sysctl
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
👉 Purpose:
 Enables network packet forwarding for Kubernetes

🟢 STEP 9: Install containerd (IMPORTANT FIX)
sudo apt install -y containerd

Configure containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
Edit:
sudo nano /etc/containerd/config.toml
Change:
SystemdCgroup = true
Restart:
sudo systemctl restart containerd
sudo systemctl enable containerd
👉 Purpose:
 containerd is the official runtime (Docker is deprecated in Kubernetes)

🟢 STEP 10: Install Kubernetes
sudo apt install -y apt-transport-https ca-certificates curl

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | \
sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update

sudo apt install -y kubelet kubeadm kubectl

sudo apt-mark hold kubelet kubeadm kubectl

🟢 STEP 11: Initialize Kubernetes
sudo kubeadm init --cri-socket=unix:///run/containerd/containerd.sock
👉 Purpose:
 Creates Kubernetes control plane

🟢 STEP 12: Configure kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

🟢 STEP 13: Install Network Plugin (MANDATORY)
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

🟢 STEP 14: Allow Pods on Single Node
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

🟢 STEP 15: Verify Cluster
kubectl get nodes
kubectl get pods -A
👉 Must show:
Ready


now install java on EC2

sudo apt update
sudo apt install fontconfig openjdk-21-jre
java -version



🟢 STEP 16: Install Jenkins
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install jenkins

sudo systemctl enable jenkins
sudo systemctl start jenkins

Give Kubernetes access:
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp /etc/kubernetes/admin.conf /var/lib/jenkins/.kube/config
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube

1. Add Jenkins to the Docker Group 
sudo usermod -aG docker jenkins 

Login Docker:
sudo su - jenkins
docker login


Restart the Jenkins Service 
sudo systemctl restart jenkins


🟢 STEP 17: Access Jenkins
http://EC2-IP:8080
Get password:
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

🟢 STEP 18: Configure Jenkins
Install Plugins:
Github integration
Docker Pipeline
Kubernetes CLI
Pipeline stage view


🟢 STEP 19: Jenkins Pipeline
Pipeline does:
Clone GitHub repo
Build Docker image
Push image to DockerHub
Deploy to Kubernetes


pipeline {
    agent any

    environment {
        IMAGE_NAME = "username/devops-project"
        TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Clone Code') {
            steps {
                git 'https://github.com/username/your_repo.git'
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



🟢 STEP 20: GitHub Webhook
👉 Add webhook in GitHub
👉 Purpose:
 Automatically triggers Jenkins on code push


🟢 STEP 21: Install Prometheus + Grafana
Install Helm:
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

Install monitoring stack:
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack

🟢 STEP 22: Access Grafana
kubectl patch svc monitoring-grafana -p '{"spec": {"type": "NodePort"}}'
kubectl get svc monitoring-grafana
Open:
http://EC2-IP:<PORT>

Get password:
kubectl get secret monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 --decode

🟢 STEP 23: Access Prometheus
kubectl patch svc monitoring-kube-prometheus-prometheus -p '{"spec": {"type": "NodePort"}}'

🟢 STEP 24: Add App Metrics
✔ Added /metrics endpoint in Node.js
 ✔ Installed prom-client
👉 Purpose:
 Expose application-level metrics

🟢 STEP 25: Create ServiceMonitor
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

🟢 STEP 26: Verify Monitoring
Prometheus → Targets → should show:
UP

🎯 FINAL RESULT
You built:
✅ CI/CD pipeline (GitHub → Jenkins → Kubernetes)
 ✅ Containerized app deployment
 ✅ Automated deployment using webhook
 ✅ Monitoring system with Prometheus + Grafana
 ✅ Custom application metrics


🚀 STEP 1: Install Kubernetes Dashboard
Run:
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

🚀 STEP 2: Create Admin User
Create file:
nano dashboard-admin.yaml
Paste:
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
Apply:
kubectl apply -f dashboard-admin.yaml

🚀 STEP 3: Get Login Token
Run:
kubectl -n kubernetes-dashboard create token admin-user
👉 Copy this token

🚀 STEP 4: Expose Dashboard
Patch service:
kubectl patch svc kubernetes-dashboard -n kubernetes-dashboard \
-p '{"spec": {"type": "NodePort"}}'

🚀 STEP 5: Get Port
Run:
kubectl get svc -n kubernetes-dashboard
Look for:
kubernetes-dashboard
You'll see:
443:32XXX/TCP

🚀 STEP 6: Open Dashboard
Open browser:
https://EC2-IP:<NODEPORT>
⚠️ Use:
https
not http

🚀 STEP 7: Login
Choose:
Token
Paste token from Step 3.
