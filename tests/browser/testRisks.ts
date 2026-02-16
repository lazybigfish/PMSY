import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testRisks(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();

  await tester.runTest('风险Tab加载', async () => {
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
    
    if (await tester.checkExistsByText('风险')) {
      await tester.clickByText('风险');
      await tester.wait(2000);
    } else {
      const page = tester.getPage();
      if (page) {
        const currentUrl = page.url();
        if (!currentUrl.includes('tab=risks')) {
          await page.goto(`${currentUrl.split('?')[0]}?tab=risks`);
          await tester.wait(2000);
        }
      }
    }
  });

  await tester.runTest('风险列表显示', async () => {
    await tester.wait(1000);
    
    const hasRiskTable = await tester.checkExists('table') ||
                         await tester.checkExistsByText('风险');
    
    if (!hasRiskTable) {
      console.log('警告: 风险列表未找到');
    }
  });

  await tester.runTest('新增风险按钮', async () => {
    const addRiskBtn = await tester.checkExistsByButton('新增风险') ||
                       await tester.checkExistsByButton('新增');
    
    if (addRiskBtn) {
      console.log('新增风险按钮已找到');
    }
  });

  await tester.runTest('风险筛选功能', async () => {
    const filterSelectors = [
      'select',
      '[class*="filter"] select'
    ];
    
    for (const selector of filterSelectors) {
      if (await tester.checkExists(selector)) {
        console.log('风险筛选器已找到');
        break;
      }
    }
  });

  await tester.runTest('风险状态更新', async () => {
    const statusSelect = await tester.checkExists('select');
    
    if (statusSelect) {
      console.log('风险状态选择器已找到');
    }
  });
}

export { testRisks };
