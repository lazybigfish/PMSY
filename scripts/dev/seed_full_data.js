import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

// Data Generators
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const PROJECT_TYPES = ['技术开发', '市场推广', '产品研发', '系统集成', '咨询服务'];
const CUSTOMERS = ['腾讯科技', '阿里巴巴', '字节跳动', '百度在线', '京东集团', '美团点评', '网易公司', '小米科技'];
const SUPPLIER_TYPES = ['硬件设备', '软件开发', '云服务', '人力外包', '咨询服务'];
const TASK_STATUSES = ['todo', 'in_progress', 'paused', 'done', 'canceled'];
const PROJECT_STATUSES = ['pending', 'in_progress', 'completed', 'paused'];

async function seedData() {
  console.log('Starting data reset and seed...');

  // 0. Login as root
  console.log('Logging in as root...');
  const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'root@pmsy.com',
    password: 'admin123'
  });

  if (loginError) {
      console.error('Login failed:', loginError.message);
      return;
  }
  console.log('Logged in successfully.');

  // 1. Clear existing data
  console.log('Clearing existing data...');
  // Delete in order to avoid foreign key constraints (though cascade should handle most)
  await supabase.from('project_suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('task_assignees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_milestones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('risks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Note: We do NOT delete users/profiles to keep the admin account valid.
  
  // 2. Get Users for assignment
  const { data: profiles } = await supabase.from('profiles').select('id');
  if (!profiles || profiles.length === 0) {
      console.error('No users found. Please create at least one user first.');
      return;
  }
  const userIds = profiles.map(p => p.id);
  const rootUser = userIds[0]; // Assume first one is valid for creation attribution

  // 3. Generate Suppliers (30+)
  console.log('Generating suppliers...');
  const suppliers = [];
  for (let i = 0; i < 35; i++) {
    suppliers.push({
      name: `供应商_${i + 1}_${randomElement(SUPPLIER_TYPES)}`,
      contact_person: `联系人${i}`,
      phone: `1380000${String(i).padStart(4, '0')}`,
      email: `supplier${i}@example.com`,
      description: `这是一个模拟的${randomElement(SUPPLIER_TYPES)}供应商`,
      status: 'active'
    });
  }
  const { data: createdSuppliers, error: supplierError } = await supabase.from('suppliers').insert(suppliers).select();
  if (supplierError) throw supplierError;
  console.log(`Created ${createdSuppliers.length} suppliers.`);

  // 4. Generate Projects (20+)
  console.log('Generating projects...');
  const projects = [];
  for (let i = 0; i < 25; i++) {
    const type = randomElement(PROJECT_TYPES);
    const customer = randomElement(CUSTOMERS);
    projects.push({
      name: `${customer}-${type}项目-${new Date().getFullYear()}-${i + 1}`,
      customer_name: customer,
      amount: randomInt(50000, 5000000),
      description: `这是一个关于${type}的模拟项目，旨在验证系统功能。`,
      status: randomElement(PROJECT_STATUSES),
      is_public: Math.random() > 0.5,
      manager_id: randomElement(userIds),
      created_at: randomDate(new Date(2024, 0, 1), new Date()).toISOString()
    });
  }
  
  const { data: createdProjects, error: projectError } = await supabase.from('projects').insert(projects).select();
  if (projectError) throw projectError;
  console.log(`Created ${createdProjects.length} projects.`);

  // 5. Generate Project Associations (Tasks, Members, Suppliers)
  for (const project of createdProjects) {
    // 5.1 Project Members
    const memberCount = randomInt(3, 8);
    const members = [];
    const usedUsers = new Set();
    
    // Add manager
    members.push({
        project_id: project.id,
        user_id: project.manager_id,
        role: 'manager'
    });
    usedUsers.add(project.manager_id);

    for(let j=0; j<memberCount; j++) {
        const uid = randomElement(userIds);
        if(!usedUsers.has(uid)) {
            members.push({
                project_id: project.id,
                user_id: uid,
                role: 'member'
            });
            usedUsers.add(uid);
        }
    }
    await supabase.from('project_members').insert(members);

    // 5.2 Project Suppliers
    const supplierCount = randomInt(2, 5);
    const projectSuppliers = [];
    const usedSuppliers = new Set();
    for(let j=0; j<supplierCount; j++) {
        const sup = randomElement(createdSuppliers);
        if(!usedSuppliers.has(sup.id)) {
            projectSuppliers.push({
                project_id: project.id,
                supplier_id: sup.id,
                cooperation_type: randomElement(['development', 'product', 'service']),
                contract_amount: randomInt(10000, 1000000)
            });
            usedSuppliers.add(sup.id);
        }
    }
    if (projectSuppliers.length > 0) {
        await supabase.from('project_suppliers').insert(projectSuppliers);
    }

    // 5.3 Tasks
    const taskCount = randomInt(10, 20);
    const tasks = [];
    for(let j=0; j<taskCount; j++) {
        tasks.push({
            project_id: project.id,
            title: `任务-${j+1}: ${randomElement(['需求分析', 'UI设计', '前端开发', '后端开发', '接口联调', '测试验证', '文档编写'])}`,
            description: '这是一个模拟任务描述',
            status: randomElement(TASK_STATUSES),
            priority: randomElement(['low', 'medium', 'high']),
            assigned_to: randomElement(Array.from(usedUsers)),
            created_by: rootUser,
            due_date: randomDate(new Date(), new Date(2025, 11, 31)).toISOString()
        });
    }
    await supabase.from('tasks').insert(tasks);
    
    // 5.4 Risks (Optional but good for completeness)
    const riskCount = randomInt(1, 5);
    const risks = [];
    for(let j=0; j<riskCount; j++) {
        risks.push({
            project_id: project.id,
            title: `风险-${j+1}: ${randomElement(['进度延期', '人员变动', '需求变更', '技术难题'])}`,
            description: '这是一个模拟风险',
            level: randomElement(['low', 'medium', 'high']),
            status: randomElement(['open', 'handling', 'closed']),
            owner_id: project.manager_id,
            impact: '可能影响项目交付时间',
            mitigation_plan: '制定应急预案'
        });
    }
    await supabase.from('risks').insert(risks);
  }

  console.log('Data seed completed successfully.');
}

seedData().catch(console.error);
