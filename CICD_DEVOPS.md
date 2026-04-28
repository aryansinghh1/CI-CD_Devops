# DevOps & CI/CD with GitHub, Docker, Kubernetes, AWS, Jenkins & Prometheus/Grafana

## Overview
This DevOps stack combines modern containerization, orchestration, and automation tools to enable continuous integration, continuous deployment, and comprehensive monitoring.

---

## 1. GitHub - Version Control & Repository Management

### Key Features
- **Repository Management**: Central hub for source code version control
- **GitHub Actions**: Native CI/CD automation without external tools
- **Branch Protection**: Enforce code review and status checks before merging
- **Webhooks**: Trigger pipelines on code events
- **Access Control**: Fine-grained permissions and team management

### GitHub Actions Workflow Example
```yaml
name: Build and Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker Image
        run: docker build -t my-app:${{ github.sha }} .
      - name: Push to AWS ECR
        run: |
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/my-app:${{ github.sha }}
```

### Best Practices
- Use branch protection rules to prevent direct pushes to main
- Implement code review process via pull requests
- Store secrets in GitHub Secrets
- Tag releases for versioning

---

## 2. Docker - Containerization

### Core Concepts
- **Images**: Immutable templates for applications
- **Containers**: Runtime instances of images
- **Registry**: Storage for images (AWS ECR)
- **Dockerfile**: Defines image build process

### Dockerfile Template
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "app.js"]
```

### Key Practices
- Use specific base image versions (not `latest`)
- Implement multi-stage builds for smaller images
- Add health checks for container monitoring
- Scan images for vulnerabilities before deployment

---

## 3. Kubernetes - Container Orchestration

### Architecture Components
- **Pods**: Smallest deployable units containing containers
- **Deployments**: Manage replicas of pods
- **Services**: Expose pods for internal/external traffic
- **ConfigMaps**: Store configuration data
- **Secrets**: Store sensitive data (passwords, tokens)
- **PersistentVolumes**: Persistent storage for stateful applications

### Sample Kubernetes Manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-app:v1.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
  namespace: production
spec:
  selector:
    app: my-app
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

### Deployment Strategy
- Use EKS (AWS Elastic Kubernetes Service) for managed Kubernetes
- Implement resource requests/limits for proper scheduling
- Use namespaces for environment isolation
- Deploy via CI/CD pipeline using kubectl apply or Helm

---

## 4. AWS Services - Cloud Infrastructure

### Key AWS Services in This Stack

#### Amazon ECR (Elastic Container Registry)
- Private Docker image registry
- Integrated with EKS for image pulls
- Image scanning and lifecycle policies
- Cross-region replication support

#### Amazon EKS (Elastic Kubernetes Service)
- Managed Kubernetes cluster on AWS
- Auto-scaling node groups
- Integration with IAM for authentication
- Automatic updates and security patches

#### Amazon ECS (Elastic Container Service)
- Alternative to Kubernetes for container orchestration
- Simpler learning curve than Kubernetes
- Native AWS integration
- Fargate launch type for serverless containers

#### AWS IAM (Identity & Access Management)
- Control access to AWS resources
- Create service accounts for applications
- Enable cross-account access if needed
- Implement least-privilege access

#### AWS CloudWatch
- Central logging and monitoring
- Collects container logs from EKS/ECS
- Integration with Prometheus for metrics

### AWS CLI Commands
```bash
# Create ECR repository
aws ecr create-repository --repository-name my-app --region us-east-1

# Push Docker image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:v1.0

# Create EKS cluster
aws eks create-cluster --name my-cluster --version 1.28 --role-arn arn:aws:iam::123456789:role/eks-service-role --resources-vpc-config subnetIds=subnet-12345,subnet-67890

# Scale EKS node group
aws eks update-nodegroup-config --cluster-name my-cluster --nodegroup-name my-nodegroup --scaling-config minSize=2,maxSize=10,desiredSize=5
```

---

## 5. Jenkins - CI/CD Automation (Alternative/Complement to GitHub Actions)

### Jenkinsfile (Pipeline as Code)
```groovy
pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = credentials('aws-account-id')
        ECR_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/my-app"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    sh 'docker build -t ${ECR_REPO}:${IMAGE_TAG} .'
                }
            }
        }
        
        stage('Push to ECR') {
            steps {
                script {
                    sh '''
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
                        docker push ${ECR_REPO}:${IMAGE_TAG}
                    '''
                }
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                script {
                    sh '''
                        aws eks update-kubeconfig --name my-cluster --region ${AWS_REGION}
                        kubectl set image deployment/my-app app=${ECR_REPO}:${IMAGE_TAG} -n production
                    '''
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

### Jenkins Setup Considerations
- Run as Docker container in Kubernetes
- Use Jenkins Kubernetes plugin for dynamic agent scaling
- Store credentials in Jenkins Credentials Store
- Implement pipeline notifications (Slack, email)

---

## 6. Prometheus - Metrics Collection & Monitoring

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Kubernetes Prometheus Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        emptyDir: {}
```

### Key Metrics to Monitor
- Container CPU/Memory usage
- Pod restart counts
- Network I/O
- Request latency
- Error rates
- Deployment replicas

---

## 7. Grafana - Visualization & Dashboards

### Grafana Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin"
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel"
        volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
        - name: provisioning
          mountPath: /etc/grafana/provisioning
      volumes:
      - name: storage
        emptyDir: {}
      - name: provisioning
        configMap:
          name: grafana-provisioning
```

### Sample Grafana Dashboard Queries
```
# Pod CPU Usage
rate(container_cpu_usage_seconds_total{pod=~"my-app-.*"}[5m])

# Memory Usage
container_memory_usage_bytes{pod=~"my-app-.*"}

# Request Rate
rate(http_requests_total[5m])

# Error Rate
rate(http_requests_total{status=~"5.."}[5m])
```

### Dashboard Best Practices
- Create separate dashboards per service/component
- Set up drill-down capabilities from high-level metrics
- Use alert thresholds on graphs
- Regular dashboard review and optimization

---

## Complete CI/CD Pipeline Flow

```
1. Developer pushes code to GitHub main branch
                    ↓
2. GitHub Actions webhook triggers
                    ↓
3. Run automated tests (npm test)
                    ↓
4. Build Docker image
                    ↓
5. Push image to AWS ECR
                    ↓
6. Deploy to EKS staging environment
                    ↓
7. Run smoke tests
                    ↓
8. (Optional) Deploy to production EKS cluster
                    ↓
9. Prometheus scrapes metrics from running pods
                    ↓
10. Grafana displays dashboards
                    ↓
11. Alert if thresholds exceeded
```

---

## Implementation Checklist

- [ ] Set up GitHub repository with branch protection
- [ ] Create Dockerfile for application
- [ ] Configure GitHub Actions workflow
- [ ] Set up AWS ECR repository
- [ ] Create EKS cluster
- [ ] Deploy Prometheus in Kubernetes
- [ ] Deploy Grafana for visualization
- [ ] Configure Prometheus scrape targets
- [ ] Create Grafana dashboards
- [ ] Set up alerting rules
- [ ] Document deployment procedures
- [ ] Implement log aggregation (CloudWatch or ELK)
- [ ] Test disaster recovery procedures
- [ ] Set up backup strategies

---

## Resources & Documentation

- **GitHub Actions**: https://docs.github.com/en/actions
- **Docker**: https://docs.docker.com
- **Kubernetes**: https://kubernetes.io/docs
- **AWS EKS**: https://docs.aws.amazon.com/eks
- **Jenkins**: https://www.jenkins.io/doc
- **Prometheus**: https://prometheus.io/docs
- **Grafana**: https://grafana.com/docs

---

## Support & Troubleshooting

For common issues and solutions, refer to:
- GitHub Actions logs: Check workflow runs in GitHub UI
- Docker logs: `docker logs <container_id>`
- Kubernetes logs: `kubectl logs <pod_name> -n <namespace>`
- Prometheus: http://prometheus-server:9090
- Grafana: http://grafana-server:3000
