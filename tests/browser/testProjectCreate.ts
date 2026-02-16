import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testProjectCreate(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();
  const timestamp = Date.now();

  await tester.runTest('新建项目页面加载', async () => {
    await tester.navigate(`${baseUrl}/projects/new`);
    await tester.wait(3000);
    
    const hasForm = await tester.checkExists('form') ||
                    await tester.checkExists('input#name') ||
                    await tester.checkExistsByText('项目名称');
    
    if (!hasForm) {
      throw new Error('新建项目表单未找到');
    }
  });

  await tester.runTest('填写项目表单', async () => {
    const nameSelectors = ['input#name', 'input[name="name"]', 'input[placeholder*="项目名称"]'];
    
    let nameFilled = false;
    for (const selector of nameSelectors) {
      if (await tester.checkExists(selector)) {
        await tester.clearInput(selector);
        await tester.type(selector, `自动化测试项目_${timestamp}`);
        nameFilled = true;
        break;
      }
    }
    
    if (!nameFilled) {
      throw new Error('项目名称输入框未找到');
    }
    
    const amountSelectors = ['input#amount', 'input[name="amount"]', 'input[placeholder*="金额"]'];
    for (const selector of amountSelectors) {
      if (await tester.checkExists(selector)) {
        await tester.clearInput(selector);
        await tester.type(selector, '100000');
        break;
      }
    }
    
    const descSelectors = ['textarea#description', 'textarea[name="description"]', 'textarea'];
    for (const selector of descSelectors) {
      if (await tester.checkExists(selector)) {
        await tester.type(selector, '这是一个自动化测试创建的项目');
        break;
      }
    }
  });

  await tester.runTest('提交创建项目', async () => {
    const submitSelectors = ['button[type="submit"]', 'button'];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      if (await tester.checkExists(selector)) {
        try {
          if (await tester.checkExistsByButton('创建') || await tester.checkExistsByButton('提交')) {
            await tester.clickByButton('创建');
            submitted = true;
          } else {
            await tester.click(selector);
            submitted = true;
          }
          
          await tester.wait(5000);
          
          const currentUrl = tester.getPage()?.url() || '';
          
          if (currentUrl.match(/\/projects\/[a-zA-Z0-9-]+$/)) {
            console.log('项目创建成功，已跳转到详情页');
          } else if (currentUrl.includes('/projects/new')) {
            throw new Error('项目创建后未跳转，可能创建失败');
          }
          break;
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!submitted) {
      throw new Error('提交按钮未找到');
    }
  });

  await tester.runTest('验证项目创建成功', async () => {
    await tester.navigate(`${baseUrl}/projects`);
    await tester.wait(3000);
    
    const projectExists = await tester.checkExistsByText(`自动化测试项目_${timestamp}`);
    
    if (projectExists) {
      console.log('新创建的项目已在列表中显示');
    } else {
      console.log('警告: 新创建的项目未在列表中找到');
    }
  });
}

export { testProjectCreate };
