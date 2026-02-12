#!/bin/bash

# PMSY 部署配置文件
# 在此设置服务器信息和认证方式

# ==================== 服务器配置 ====================

# 服务器 IP 地址
SERVER_IP="43.136.69.250"

# SSH 用户名
SERVER_USER="ubuntu"

# SSH 端口（默认 22）
SSH_PORT="22"

# ==================== 认证方式（二选一） ====================

# 方式1：SSH Key 认证（推荐，无需密码）
# 设置为 "yes" 启用
USE_SSH_KEY="yes"

# SSH Key 路径
SSH_KEY_PATH="$HOME/.ssh/id_rsa"

# 方式2：密码认证（需要安装 sshpass，Mac 可能不支持）
# 如果 USE_SSH_KEY="no"，则使用密码
# SSH 密码（留空则每次手动输入）
SERVER_PASSWORD=""

# ==================== 部署配置 ====================

# 目标架构: amd64 或 arm64
# 留空则部署时询问
TARGET_ARCH="amd64"

# 远程部署目录
REMOTE_DIR="/opt/pmsy"

# ==================== 镜像获取方式 ====================

# 镜像获取方式: "local" 或 "remote"
# "local" - 本地上传: 适合离线环境或网络不稳定（Mac需配合buildx使用）
# "remote" - 服务器拉取: 适合服务器能访问 Docker Hub（推荐，最快）
IMAGE_SOURCE="remote"
