import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const adminId = '00000000-0000-0000-0000-000000000001';

  // 检查是否已有项目数据
  const existingProjects = await knex('projects').count('id as count').first();
  if (existingProjects && (existingProjects.count as number) > 0) {
    console.log(`✅ 已存在 ${existingProjects.count} 个项目，跳过创建演示数据`);
    return;
  }

  // 插入示例项目
  const projects = await knex('projects').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      name: '企业官网重构项目',
      customer_name: 'ABC科技有限公司',
      amount: 500000,
      description: '对公司官网进行全面重构，采用最新技术栈',
      status: 'in_progress',
      is_public: true,
      manager_id: adminId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: '移动APP开发项目',
      customer_name: 'XYZ互联网公司',
      amount: 800000,
      description: '开发iOS和Android双平台移动应用',
      status: 'pending',
      is_public: true,
      manager_id: adminId,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: '数据分析平台建设',
      customer_name: '大数据集团',
      amount: 1200000,
      description: '构建企业级数据分析与可视化平台',
      status: 'completed',
      is_public: false,
      manager_id: adminId,
      created_at: new Date(),
      updated_at: new Date(),
    }
  ]).returning('id');

  console.log(`✅ 已创建 ${projects.length} 个示例项目`);

  // 插入项目成员关系
  await knex('project_members').insert(
    projects.map((p: any) => ({
      project_id: p.id,
      user_id: adminId,
      role: 'manager',
      joined_at: new Date(),
    }))
  );

  console.log('✅ 已添加项目成员关系');

  // 插入示例任务
  const tasks = [
    {
      title: '需求分析与文档编写',
      description: '收集客户需求，编写详细的需求规格说明书',
      status: 'done',
      priority: 'high',
      project_index: 0,
    },
    {
      title: 'UI/UX设计',
      description: '完成网站整体视觉设计和交互设计',
      status: 'in_progress',
      priority: 'high',
      project_index: 0,
    },
    {
      title: '前端开发',
      description: '使用React进行前端页面开发',
      status: 'todo',
      priority: 'medium',
      project_index: 0,
    },
    {
      title: '后端API开发',
      description: '设计和开发RESTful API接口',
      status: 'todo',
      priority: 'medium',
      project_index: 0,
    },
    {
      title: '技术选型调研',
      description: '调研并确定移动开发技术方案',
      status: 'done',
      priority: 'high',
      project_index: 1,
    },
    {
      title: '原型设计',
      description: '制作APP交互原型',
      status: 'in_progress',
      priority: 'medium',
      project_index: 1,
    },
  ];

  for (const task of tasks) {
    const projectId = projects[task.project_index].id;
    await knex('tasks').insert({
      id: knex.raw('gen_random_uuid()'),
      project_id: projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: adminId,
      created_by: adminId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  console.log(`✅ 已创建 ${tasks.length} 个示例任务`);
  console.log('\n🎉 演示数据初始化完成！');
}
