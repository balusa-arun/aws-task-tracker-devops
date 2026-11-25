# AWS 4-hour DevOps practice project: Task Tracker

This is a small but end-to-end project: CloudFormation provisions EC2, DynamoDB, SNS, IAM and CloudWatch; GitHub Actions runs tests and deploys the Node/Express app to EC2; the browser UI reads/writes tasks through the API.

## Architecture
- EC2 (Amazon Linux 2023): Express frontend + API on port 3000, automatically proxied by Nginx on port 80 during boot.
- DynamoDB: persists task records.
- IAM instance role: lets the app access its DynamoDB table and CloudWatch Logs without AWS credentials stored on the server.
- CloudWatch Agent: publishes memory/disk metrics and ships the app log.
- CloudWatch alarms: CPU > 70% and memory > 85% for two 5-minute periods.
- SNS: sends alarm emails (confirm the subscription email when AWS sends the confirmation).
- GitHub Actions: runs tests and deploys on pushes to `main`.

## Four-hour schedule
1. 0:00–0:25 — Create repo, understand the folders, set up key pair.
2. 0:25–1:00 — Deploy CloudFormation stack and confirm email subscription.
3. 1:00–1:45 — Configure SSH and GitHub secrets; first deployment.
4. 1:45–2:30 — Verify web app and DynamoDB writes.
5. 2:30–3:15 — CloudWatch dashboards/logs and alarms.
6. 3:15–4:00 — Trigger a code change, observe deployment, cleanup or document.

## 1. Prerequisites
- AWS account with permissions to create EC2, IAM roles/policies, DynamoDB, SNS, CloudWatch, CloudFormation.
- GitHub account and Git installed locally.
- A key pair in the same AWS Region that you will deploy to. In EC2 console: **Key pairs → Create key pair**, download the `.pem` file and keep it private.
- Know your public IP. You can check it with a trusted IP-check site or search “what is my IP”. Enter it as `your-public-ip/32`.

## 2. Create GitHub repository and upload project
1. Create an empty GitHub repository named `aws-task-tracker-devops` (do not initialize it with README if you will push this folder).
2. Copy this project folder to your machine and open a terminal in it.
3. Run:
   ```bash
   git init
   git add .
   git commit -m "Initial task tracker app and AWS infrastructure"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/aws-task-tracker-devops.git
   git push -u origin main
   ```
4. In `app/`, install dependencies locally and run tests (optional local verification):
   ```bash
   cd app
   npm install
   npm test
   ```

## 3. Deploy infrastructure with CloudFormation
1. AWS Console → CloudFormation → Create stack → With new resources (standard).
2. Upload `cloudformation/template.yaml`.
3. Set stack name, e.g. `task-tracker-dev`.
4. Parameters:
   - `KeyPairName`: choose the EC2 key pair you created.
   - `SSHAllowedCIDR`: your public IP in CIDR notation, such as `203.0.113.10/32`. **Do not use 0.0.0.0/0 for SSH.**
   - `AlertEmail`: email you can access.
   - `InstanceType`: `t2.micro` (check current Free Tier eligibility and regional pricing first).
5. Acknowledge IAM resource creation if prompted and create stack.
6. Wait for `CREATE_COMPLETE`. Open **Outputs** and copy `WebURL` and `InstanceId`.
7. Confirm the SNS subscription email. Until confirmed, alarm emails will not arrive.

## 4. Add GitHub Actions deployment secrets
In GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
- `EC2_HOST`: EC2 Public IPv4 DNS from EC2 details (or Public IPv4 address).
- `EC2_SSH_PRIVATE_KEY`: entire contents of your `.pem` private key.

Never commit the private key into Git.


## 5. Deploy application via GitHub Actions
1. Push a commit to `main` (workflow is `.github/workflows/deploy.yml`).
2. Repo → Actions → open `CI and Deploy to EC2`.
3. `test` job installs dependencies and runs unit tests.
4. If tests pass on a push to main, deploy job copies app files over SSH, installs npm packages on EC2, and restarts systemd service.
5. Check Actions logs if a job fails.

### Access app
CloudFormation UserData installs and configures Nginx to proxy HTTP port 80 to the Node app on port 3000. After GitHub Actions finishes deploying, open the CloudFormation `WebURL` in your browser.

## 6. Verify application/database
- Open the WebURL, add a task, refresh, and check it remains.
- EC2 SSH commands:
  ```bash
  sudo systemctl status task-tracker
  sudo journalctl -u task-tracker -n 100 --no-pager
  curl http://127.0.0.1:3000/health
  ```
- DynamoDB console → Tables → stack table → Explore items; confirm task items appear.

## 7. Monitoring and alerts
1. CloudWatch → Metrics → EC2 → Per-Instance Metrics → select CPUUtilization for your instance.
2. CloudWatch → Logs → Log groups → `/devops-task-tracker/app`; inspect log stream for app output.
3. CloudWatch → Alarms → confirm `CPUAlarm` and `MemoryAlarm` exist and are `OK` or `INSUFFICIENT_DATA` initially.
4. SNS email subscription must show Confirmed.
5. CPU alarm: >70% average for 2 consecutive 5-minute periods. Memory alarm: >85% for 2 consecutive 5-minute periods.
6. Optional quick CPU test (only briefly; stop after test): SSH into instance and run `sudo dnf install -y stress-ng && stress-ng --cpu 1 --timeout 3m`. This may not trigger alarm due to 5-minute periods and evaluation windows; do not rely on it for immediate testing. Stop test processes after.

## 8. Troubleshooting
- **SSH timeout:** Check instance running, public IP, security group SSH CIDR, and local key permissions (`chmod 400 key.pem`).
- **Actions SSH error:** Confirm `EC2_HOST` and private key secret match the EC2 key pair. EC2 login user for Amazon Linux is `ec2-user`.
- **App not loading:** Check systemd app service, app logs, and Nginx:
  ```bash
  sudo systemctl status task-tracker nginx
  sudo journalctl -u task-tracker -f
  sudo nginx -t
  ```
- **DynamoDB AccessDenied:** check instance profile role and the table name environment variable in service configuration.
- **SNS no emails:** confirm SNS email subscription and check alarm state/history.

## 9. Clean up to avoid charges
CloudFormation → select stack → Delete. This deletes stack resources including EC2, DynamoDB and SNS resources. Review any retained resources or data first. Always check AWS Billing/Free Tier and region pricing before starting; free-tier eligibility varies.

## Suggested improvements after the 4-hour exercise
- Add HTTPS with a domain and ACM certificate/ALB.
- Use GitHub Actions OIDC to assume an AWS role instead of SSH-based deployment.
- Use a private subnet, load balancer, and managed database for a production-style architecture.
- Add DynamoDB pagination and tests for API endpoints.

- Added few lines in the end
