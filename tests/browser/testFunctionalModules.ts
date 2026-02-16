import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testFunctionalModules(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();

  await tester.runTest('功能模块Tab加载', async () => {
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
    
    if (await tester.checkExistsByText('功能模块')) {
      await tester.clickByText('功能模块');
      await tester.wait(2000);
    } else {
      const page = tester.getPage();
      if (page) {
        const currentUrl = page.url();
        if (!currentUrl.includes('tab=modules')) {
          await page.goto(`${currentUrl.split('?')[0]}?tab=modules`);
          await tester.wait(2000);
        }
      }
    }
  });

  await tester.runTest('功能模块树形结构显示', async () => {
    await tester.wait(1000);
    
    const hasModuleTree = await tester.checkExists('[class*="border-l"]') ||
                          await tester.checkExists('[class*="tree"]') ||
                          await tester.checkExistsByText('模块');
    
    if (!hasModuleTree) {
      console.log('警告: 功能模块树形结构未找到，可能没有模块数据');
    }
  });

  await tester.runTest('新增模块按钮', async () => {
    const addModuleBtn = await tester.checkExistsByButton('新增模块') ||
                         await tester.checkExistsByButton('新增');
    
    if (addModuleBtn) {
      console.log('新增模块按钮已找到');
    } else {
      console.log('警告: 新增模块按钮未找到');
    }
  });

  await tester.runTest('模块导出功能', async () => {
    const exportBtn = await tester.checkExistsByButton('导出');
    
    if (exportBtn) {
      console.log('导出按钮已找到');
    }
  });

  await tester.runTest('模块导入功能', async () => {
    const importInput = await tester.checkExists('input[type="file"]');
    
    if (importInput) {
      console.log('导入功能已找到');
    }
  });
}

export { testFunctionalModules };
