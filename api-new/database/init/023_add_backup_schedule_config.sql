-- 添加定时备份配置到系统设置
-- 用于存储定时备份的配置信息

-- 插入默认定时备份配置
INSERT INTO system_settings (key, value, description)
VALUES (
    'backup_schedule',
    '{
        "enabled": false,
        "cron": "0 2 * * *",
        "timeZone": "Asia/Shanghai",
        "keepCount": 10,
        "options": {
            "includeLogs": false,
            "includeNotifications": false,
            "includeForum": false,
            "encrypt": false
        }
    }'::jsonb,
    '定时备份配置，包括启用状态、执行时间、保留数量等'
)
ON CONFLICT (key) DO NOTHING;

-- 添加备份存储路径配置
INSERT INTO system_settings (key, value, description)
VALUES (
    'backup_storage',
    '{
        "path": "./backups",
        "maxFileSize": 5368709120,
        "allowedExtensions": [".zip"]
    }'::jsonb,
    '备份存储配置，包括存储路径、最大文件大小等'
)
ON CONFLICT (key) DO NOTHING;
