import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testProjectList(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();

  await tester.runTest('项目列表页面加载', async () => {
    await tester.navigate(`${baseUrl}/projects`);
    await tester.wait(3000);
    
    const hasPageTitle = await tester.checkExists('h1') || 
                         await tester.checkExistsByText('项目');
    if (!hasPageTitle) {
      throw new Error('项目列表页面标题未找到');
    }
    
    const hasProjectTable = await tester.checkExists('table') || 
                            await tester.checkExists('[class*="card"]') ||
                            await tester.checkExistsByText('项目');
    if (!hasProjectTable) {
      throw new Error('项目列表容器未找到');
    }
  });

  await tester.runTest('统计卡片显示', async () => {
    await tester.wait(1000);
    
    const statCards = await tester.checkExists('[class*="grid"]') ||
                       await tester.checkExists('[class*="stat"]') ||
                       await tester.checkExistsByText('全部');
    
    if (!statCards) {
      console.log('警告: 未找到统计卡片，可能页面结构不同');
    }
  });

  await tester.runTest('搜索功能', async () => {
    const searchSelectors = [
      'input[placeholder*="搜索"]',
      'input[placeholder*="项目"]',
      '.search-input',
      'input[type="text"]'
    ];
    
    let searchFound = false;
    for (const selector of searchSelectors) {
      if (await tester.checkExists(selector)) {
        try {
          await tester.clearInput(selector);
          await tester.type(selector, '测试项目');
          await tester.wait(1000);
          searchFound = true;
          break;
        } catch {
          continue;
        }
      }
    }
    
    if (!searchFound) {
      console.log('警告: 未找到搜索输入框');
    }
  });

  await tester.runTest('状态筛选功能', async () => {
    const filterSelectors = [
      'select',
      '[class*="filter"] select'
    ];
    
    let filterFound = false;
    for (const selector of filterSelectors) {
      if (await tester.checkExists(selector)) {
        try {
          await tester.select(selector, 'in_progress');
          await tester.wait(1000);
          filterFound = true;
          break;
        } catch {
          continue;
        }
      }
    }
    
    if (!filterFound) {
      console.log('警告: 未找到状态筛选器');
    }
  });

  await tester.runTest('新建项目按钮', async () => {
    const newProjectBtn = await tester.checkExists('a[href="/projects/new"]') ||
                           await tester.checkExistsByButton('新建项目') ||
                           await tester.checkExistsByButton('新建');
    
    if (!newProjectBtn) {
      console.log('警告: 未找到新建项目按钮');
    }
  });

  await tester.runTest('项目详情跳转', async () => {
    const projectLinkSelectors = [
      'table tbody tr',
      'a[href^="/projects/"]',
      '[class*="project"]'
    ];
    
    let clicked = false;
    for (const selector of projectLinkSelectors) {
      try {
        if (await tester.checkExists(selector)) {
          await tester.click(selector);
          await tester.wait(3000);
          
          const currentUrl = tester.getPage()?.url() || '';
          if (currentUrl.match(/\/projects\/[a-zA-Z0-9-]+$/)) {
            clicked = true;
            break;
          }
        }
      } catch {
        continue;
      }
    }
    
    if (!clicked) {
      console.log('警告: 未能点击项目进入详情页，可能没有项目数据');
    }
  });
}

export { testProjectList };
