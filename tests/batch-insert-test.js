/**
 * 批量插入功能测试脚本
 * 运行方式: node tests/batch-insert-test.js
 */

const API_URL = 'http://localhost:3001';

// 测试配置
const TEST_CONFIG = {
  email: 'admin@example.com',
  password: 'admin123',
};

// 辅助函数：发送请求
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(`${endpoint} 失败: ${error.message || response.status}`);
  }

  return response.json();
}

// 登录获取 token
async function login() {
  console.log('🔐 登录获取 token...');
  const result = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_CONFIG.email,
      password: TEST_CONFIG.password,
    }),
  });
  console.log('✅ 登录成功');
  return result.access_token;
}

// 测试1: 批量插入角色权限
async function testBatchInsertRolePermissions(token) {
  console.log('\n📋 测试1: 批量插入角色权限');
  const testRoleKey = `test_role_${Date.now()}`;

  try {
    // 批量插入
    const insertData = [
      { role_key: testRoleKey, module_key: 'dashboard' },
      { role_key: testRoleKey, module_key: 'projects' },
      { role_key: testRoleKey, module_key: 'tasks' },
    ];

    console.log(`  插入 ${insertData.length} 条权限记录...`);
    const result = await request('/rest/v1/role_permissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(insertData),
    });

    console.log(`  ✅ 批量插入成功，返回 ${result.length} 条记录`);

    // 验证插入结果
    const verifyResult = await request(`/rest/v1/role_permissions?eq.role_key=${testRoleKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (verifyResult.length === insertData.length) {
      console.log(`  ✅ 验证成功，查询到 ${verifyResult.length} 条记录`);
    } else {
      console.log(`  ❌ 验证失败，期望 ${insertData.length} 条，实际 ${verifyResult.length} 条`);
      return false;
    }

    // 清理测试数据
    await request(`/rest/v1/role_permissions?eq.role_key=${testRoleKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('  ✅ 清理测试数据成功');

    return true;
  } catch (error) {
    console.log(`  ❌ 测试失败: ${error.message}`);
    return false;
  }
}

// 测试2: 单条插入仍然正常工作
async function testSingleInsert(token) {
  console.log('\n📋 测试2: 单条插入');
  const testRoleKey = `single_test_role_${Date.now()}`;

  try {
    const insertData = { role_key: testRoleKey, module_key: 'dashboard' };

    console.log('  插入单条记录...');
    const result = await request('/rest/v1/role_permissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(insertData),
    });

    console.log(`  ✅ 单条插入成功`);

    // 清理
    await request(`/rest/v1/role_permissions?eq.role_key=${testRoleKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    return true;
  } catch (error) {
    console.log(`  ❌ 测试失败: ${error.message}`);
    return false;
  }
}

// 测试3: 批量插入任务分配人
async function testBatchInsertTaskAssignees(token) {
  console.log('\n📋 测试3: 批量插入任务分配人');

  try {
    // 先创建一个测试任务
    const taskResult = await request('/rest/v1/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: `批量插入测试任务_${Date.now()}`,
        description: '用于测试批量插入功能',
        status: 'pending',
        priority: 'medium',
      }),
    });

    const taskId = taskResult.id;
    console.log(`  创建测试任务成功，ID: ${taskId}`);

    // 批量插入分配人
    const assigneesToInsert = [
      { task_id: taskId, user_id: 'user1', is_primary: true },
      { task_id: taskId, user_id: 'user2', is_primary: false },
      { task_id: taskId, user_id: 'user3', is_primary: false },
    ];

    console.log(`  插入 ${assigneesToInsert.length} 条分配人记录...`);
    const result = await request('/rest/v1/task_assignees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(assigneesToInsert),
    });

    console.log(`  ✅ 批量插入成功，返回 ${result.length} 条记录`);

    // 验证
    const verifyResult = await request(`/rest/v1/task_assignees?eq.task_id=${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (verifyResult.length === assigneesToInsert.length) {
      console.log(`  ✅ 验证成功，查询到 ${verifyResult.length} 条记录`);
    } else {
      console.log(`  ❌ 验证失败，期望 ${assigneesToInsert.length} 条，实际 ${verifyResult.length} 条`);
      return false;
    }

    // 清理
    await request(`/rest/v1/task_assignees?eq.task_id=${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await request(`/rest/v1/tasks?id=eq.${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('  ✅ 清理测试数据成功');

    return true;
  } catch (error) {
    console.log(`  ❌ 测试失败: ${error.message}`);
    return false;
  }
}

// 测试4: 批量插入任务模块关联
async function testBatchInsertTaskModules(token) {
  console.log('\n📋 测试4: 批量插入任务模块关联');

  try {
    // 创建测试任务
    const taskResult = await request('/rest/v1/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: `模块关联测试任务_${Date.now()}`,
        description: '用于测试批量插入模块关联',
        status: 'pending',
        priority: 'medium',
      }),
    });

    const taskId = taskResult.id