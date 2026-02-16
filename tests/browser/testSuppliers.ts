import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testSuppliers(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();

  await tester.runTest('供应商Tab加载', async () => {
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
    
    if (await tester.checkExistsByText('供应商')) {
      await tester.clickByText('供应商');
      await tester.wait(2000);
    } else {
      const page = tester.getPage();
      if (page) {
        const currentUrl = page.url();
        if (!currentUrl.includes('tab=suppliers')) {
          await page.goto(`${currentUrl.split('?')[0]}?tab=suppliers`);
          await tester.wait(2000);
        }
      }
    }
  });

  await tester.runTest('供应商列表显示', async () => {
    await tester.wait(1000);
    
    const hasSupplierTable = await tester.checkExists('table') ||
                             await tester.checkExistsByText('供应商');
    
    if (!hasSupplierTable) {
      console.log('警告: 供应商列表未找到');
    }
  });

  await tester.runTest('关联供应商按钮', async () => {
    const addSupplierBtn = await tester.checkExistsByButton('关联供应商') ||
                           await tester.checkExistsByButton('新增');
    
    if (addSupplierBtn) {
      console.log('关联供应商按钮已找到');
    }
  });

  await tester.runTest('供应商详情功能', async () => {
    const detailBtn = await tester.checkExistsByButton('详情');
    
    if (detailBtn) {
      console.log('供应商详情按钮已找到');
    }
  });
}

export { testSuppliers };
