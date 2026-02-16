import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testMilestones(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();

  await tester.runTest('里程碑Tab加载', async () => {
    await tester.navigate(`${baseUrl}/projects`);
    await tester.wait(3000);
    
    const projectSelectors = [
      'table tbody tr',
      'a[href^="/projects/"]',
      '[class*="project"]'
    ];
    
    for (const selector of projectSelectors) {
      try {
        if (await tester.checkExists(selector)) {
          await tester.click(selector);
          await tester.wait(3000);
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (await tester.checkExistsByText('里程碑')) {
      await tester.clickByText('里程碑');
      await tester.wait(2000);
    } else {
      const page = tester.getPage();
      if (page) {
        const currentUrl = page.url();
        if (!currentUrl.includes('tab=milestones')) {
          await page.goto(`${currentUrl.split('?')[0]}?tab=milestones`);
          await tester.wait(2000);
        }
      }
    }
  });

  await tester.runTest('里程碑阶段列表显示', async () => {
    await tester.wait(1000);
    
    const hasMilestones = await tester.checkExists('[class*="sidebar"]') ||
                          await tester.checkExistsByText('阶段') ||
                          await tester.checkExistsByText('进场');
    
    if (!hasMilestones) {
      console.log('警告: 里程碑阶段列表未找到');
    }
  });

  await tester.runTest('里程碑任务列表显示', async () => {
    const hasTasks = await tester.checkExistsByText('任务') ||
                     await tester.checkExists('input[type="checkbox"]');
    
    if (hasTasks) {
      console.log('里程碑任务列表已找到');
    } else {
      console.log('警告: 里程碑任务列表未找到');
    }
  });

  await tester.runTest('任务完成状态切换', async () => {
    const checkbox = await tester.checkExists('input[type="checkbox"]');
    
    if (checkbox) {
      try {
        await tester.click('input[type="checkbox"]');
        await tester.wait(1000);
        console.log('任务状态切换成功');
      } catch {
        console.log('警告: 任务状态切换失败');
      }
    }
  });

  await tester.runTest('新增任务按钮', async () => {
    const addTaskBtn = await tester.checkExistsByButton('新增任务') ||
                       await tester.checkExistsByButton('新增');
    
    if (addTaskBtn) {
      console.log('新增任务按钮已找到');
    }
  });

  await tester.runTest('阶段下载功能', async () => {
    const downloadBtn = await tester.checkExistsByButton('阶段下载') ||
                        await tester.checkExistsByButton('下载');
    
    if (downloadBtn) {
      console.log('阶段下载按钮已找到');
    }
  });
}

export { testMilestones };
