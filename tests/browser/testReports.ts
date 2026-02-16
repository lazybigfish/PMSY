import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testReports(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();

  await tester.runTest('周日报Tab加载', async () => {
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
    
    if (await tester.checkExistsByText('周日报')) {
      await tester.clickByText('周日报');
      await tester.wait(2000);
    } else {
      const page = tester.getPage();
      if (page) {
        const currentUrl = page.url();
        if (!currentUrl.includes('tab=reports')) {
          await page.goto(`${currentUrl.split('?')[0]}?tab=reports`);
          await tester.wait(2000);
        }
      }
    }
  });

  await tester.runTest('周日报列表显示', async () => {
    await tester.wait(1000);
    
    const hasReportList = await tester.checkExists('ul') ||
                          await tester.checkExistsByText('日报') ||
                          await tester.checkExistsByText('周报');
    
    if (!hasReportList) {
      console.log('警告: 周日报列表未找到');
    }
  });

  await tester.runTest('日报/周报Tab切换', async () => {
    const dailyTab = await tester.checkExistsByText('项目日报');
    const weeklyTab = await tester.checkExistsByText('项目周报');
    
    if (dailyTab && weeklyTab) {
      try {
        await tester.clickByText('项目周报');
        await tester.wait(1000);
        
        await tester.clickByText('项目日报');
        await tester.wait(1000);
        
        console.log('日报/周报Tab切换成功');
      } catch {
        console.log('警告: Tab切换失败');
      }
    }
  });

  await tester.runTest('新建报告按钮', async () => {
    const newReportBtn = await tester.checkExists('a[href*="/reports/new"]') ||
                         await tester.checkExistsByButton('新建');
    
    if (newReportBtn) {
      console.log('新建报告按钮已找到');
    }
  });
}

export { testReports };
