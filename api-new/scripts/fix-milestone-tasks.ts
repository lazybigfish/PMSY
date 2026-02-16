import { db } from '../src/config/database';

async function fixMilestoneTasks() {
  console.log('开始修复 milestone_tasks 表结构...');

  try {
    // 1. 添加 milestone_id 字段
    await db.raw(`
      ALTER TABLE milestone_tasks 
      ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES project_milestones(id) ON DELETE CASCADE
    `);
    console.log('✅ 已添加 milestone_id 字段');

    // 2. 修改 template_id 为可选
    await db.raw(`
      ALTER TABLE milestone_tasks 
      ALTER COLUMN template_id DROP NOT NULL
    `);
    console.log('✅ 已修改 template_id 为可选');

    // 3. 创建索引
    await db.raw(`
      CREATE INDEX IF NOT EXISTS idx_milestone_tasks_milestone_id ON milestone_tasks(milestone_id)
    `);
    console.log('✅ 已创建索引');

    // 4. 为现有里程碑创建任务（基于模板）
    // 首先检查是否有 milestone_task_templates 表
    const hasTemplateTable = await db.schema.hasTable('milestone_task_templates');
    
    if (hasTemplateTable) {
      // 使用模板创建任务
      // 注意：milestone_task_templates 表使用 milestone_template_id 而不是 template_id
      const milestones = await db('project_milestones')
        .join('milestone_templates', 'project_milestones.template_id', 'milestone_templates.id')
        .select('project_milestones.id as milestone_id', 'milestone_templates.id as template_id');
      
      for (const milestone of milestones) {
        const existingTasks = await db('milestone_tasks')
          .where('milestone_id', milestone.milestone_id)
          .first();
        
        if (!existingTasks) {
          const templateTasks = await db('milestone_task_templates')
            .where('milestone_template_id', milestone.template_id)
            .select('*');
          
          for (const taskTemplate of templateTasks) {
            // 确保 output_documents 是有效的 JSON
            let outputDocs = taskTemplate.output_documents;
            if (typeof outputDocs === 'string') {
              try {
                outputDocs = JSON.parse(outputDocs);
              } catch {
                outputDocs = [];
              }
            }
            if (!outputDocs || !Array.isArray(outputDocs)) {
              outputDocs = [];
            }

            await db('milestone_tasks').insert({
              milestone_id: milestone.milestone_id,
              template_id: milestone.template_id,
              name: taskTemplate.name,
              description: taskTemplate.description,
              is_required: taskTemplate.is_required,
              output_documents: JSON.stringify(outputDocs),
              sort_order: taskTemplate.sort_order,
              is_completed: false,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }
      }
      console.log('✅ 已根据模板为现有里程碑创建任务');
    } else {
      // 如果没有模板表，创建一些默认任务
      const milestones = await db('project_milestones').select('id', 'name');
      
      for (const milestone of milestones) {
        const existingTasks = await db('milestone_tasks')
          .where('milestone_id', milestone.id)
          .first();
        
        if (!existingTasks) {
          // 为每个里程碑创建默认任务
          await db('milestone_tasks').insert([
            {
              milestone_id: milestone.id,
              name: '任务规划',
              description: '制定阶段任务计划',
              is_required: true,
              is_completed: false,
              output_documents: JSON.stringify([{ name: '任务计划书', required: true }]),
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              milestone_id: milestone.id,
              name: '执行与监控',
              description: '执行阶段任务并监控进度',
              is_required: true,
              is_completed: false,
              output_documents: JSON.stringify([{ name: '进度报告', required: true }]),
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              milestone_id: milestone.id,
              name: '阶段评审',
              description: '完成阶段评审并输出评审报告',
              is_required: true,
              is_completed: false,
              output_documents: JSON.stringify([{ name: '评审报告', required: true }]),
              created_at: new Date(),
              updated_at: new Date(),
            }
          ]);
        }
      }
      console.log('✅ 已为现有里程碑创建默认任务');
    }

    // 5. 为没有里程碑的项目创建里程碑和任务
    const projectsWithoutMilestones = await db('projects')
      .select('projects.id')
      .leftJoin('project_milestones', 'projects.id', 'project_milestones.project_id')
      .whereNull('project_milestones.id');

    const templates = await db('milestone_templates')
      .where('is_active', true)
      .orderBy('phase_order')
      .select('*');

    for (const project of projectsWithoutMilestones) {
      // 为每个项目创建里程碑
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const [milestone] = await db('project_milestones')
          .insert({
            project_id: project.id,
            template_id: template.id,
            name: template.name,
            status: i === 0 ? 'in_progress' : 'pending',
            phase_order: template.phase_order,
            is_current: i === 0,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning('id');

        // 为里程碑创建任务
        if (hasTemplateTable) {
          const templateTasks = await db('milestone_task_templates')
            .where('milestone_template_id', template.id)
            .select('*');

          for (const taskTemplate of templateTasks) {
            // 确保 output_documents 是有效的 JSON
            let outputDocs = taskTemplate.output_documents;
            if (typeof outputDocs === 'string') {
              try {
                outputDocs = JSON.parse(outputDocs);
              } catch {
                outputDocs = [];
              }
            }
            if (!outputDocs || !Array.isArray(outputDocs)) {
              outputDocs = [];
            }

            await db('milestone_tasks').insert({
              milestone_id: milestone.id,
              template_id: template.id,
              name: taskTemplate.name,
              description: taskTemplate.description,
              is_required: taskTemplate.is_required,
              output_documents: JSON.stringify(outputDocs),
              sort_order: taskTemplate.sort_order,
              is_completed: false,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        } else {
          // 创建默认任务
          await db('milestone_tasks').insert([
            {
              milestone_id: milestone.id,
              name: '任务规划',
              description: '制定阶段任务计划',
              is_required: true,
              is_completed: false,
              output_documents: JSON.stringify([{ name: '任务计划书', required: true }]),
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              milestone_id: milestone.id,
              name: '执行与监控',
              description: '执行阶段任务并监控进度',
              is_required: true,
              is_completed: false,
              output_documents: JSON.stringify([{ name: '进度报告', required: true }]),
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              milestone_id: milestone.id,
              name: '阶段评审',
              description: '完成阶段评审并输出评审报告',
              is_required: true,
              is_completed: false,
              output_documents: JSON.stringify([{ name: '评审报告', required: true }]),
              created_at: new Date(),
              updated_at: new Date(),
            }
          ]);
        }
      }
    }

    if (projectsWithoutMilestones.length > 0) {
      console.log(`✅ 已为 ${projectsWithoutMilestones.length} 个项目初始化里程碑和任务`);
    }

    console.log('\n🎉 修复完成！');
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

fixMilestoneTasks();
