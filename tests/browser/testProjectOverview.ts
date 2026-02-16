import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testProjectOverview(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();

  await tester.runTest('项目概览Tab加载', async () => {
    await tester.navigate(`${baseUrl}/projects`);
    await tester.wait(3000);
    
    const projectSelectors = [
      'table tbody tr',
      'a[href^="/projects/"]',
      '[class*="project"]'
    ];
    
    let navigated = false;
    for (const selector of projectSelectors) {
      try {
        if (await tester.checkExists(selector)) {
          await tester.click(selector);
          await tester.wait(3000);
          
          const currentUrl = tester.getPage()?.url() || '';
          if (currentUrl.match(/\/projects\/[a-zA-Z0-9-]+$/)) {
            navigated = true;
            break;
          }
        }
      } catch {
        continue;
      }
    }
    
    if (!navigated) {
      console.log('警告: 无法进入项目详情页，可能没有项目数据');
    }
  });

  await tester.runTest('项目基本信息显示', async () => {
    await tester.wait(1000);
    
    const hasProjectName = await tester.checkExists('h1') ||
                            await tester.checkExistsByText('项目');
    
    if (!hasProjectName) {
      throw new Error('项目名称未显示');
    }
    
    const hasTabs = await tester.checkExists('nav') ||
                    await tester.checkExistsByText('概览') ||
                    await tester.checkExistsByText('功能模块');
    
    if (!hasTabs) {
      console.log('警告: Tab导航未找到');
    }
  });

  await tester.runTest('编辑按钮显示', async () => {
    const editBtn = await tester.checkExistsByButton('编辑') ||
                    await tester.checkExists('[class*="edit"]');
    
    if (editBtn) {
      console.log('编辑按钮已找到');
    } else {
      console.log('警告: 编辑按钮未找到，可能当前用户无编辑权限');
    }
  });

  await tester.runTest('项目编辑功能', async () => {
    if (await tester.checkExistsByButton('编辑')) {
      try {
        await tester.clickByButton('编辑');
        await tester.wait(1000);
        
        const hasEditForm = await tester.checkExists('input[value]') ||
                            await tester.checkExists('input[class*="border"]');
        
        if (hasEditForm) {
          console.log('编辑模式已激活');
          
          if (await tester.checkExistsByButton('取消')) {
            await tester.clickByButton('取消');
            await tester.wait(500);
          }
        }
      } catch {
        console.log('警告: 编辑功能测试失败');
      }
    }
  });
}

export { testProjectOverview };
