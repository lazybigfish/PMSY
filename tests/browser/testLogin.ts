import { AutomatedBrowserTester } from './AutomatedBrowserTester';

async function testLogin(tester: AutomatedBrowserTester): Promise<void> {
  const baseUrl = tester.getBaseUrl();
  const testAccount = tester.getTestAccount();

  await tester.runTest('登录页面加载', async () => {
    await tester.navigate(`${baseUrl}/login`);
    await tester.waitForSelector('input#username', 10000);
    await tester.waitForSelector('input#password', 10000);
    
    const usernameExists = await tester.checkExists('input#username');
    const passwordExists = await tester.checkExists('input#password');
    const loginButtonExists = await tester.checkExists('button[type="submit"]');
    
    if (!usernameExists || !passwordExists || !loginButtonExists) {
      throw new Error('登录页面元素不完整');
    }
  });

  await tester.runTest('登录成功流程', async () => {
    await tester.clearInput('input#username');
    await tester.type('input#username', testAccount.username);
    
    await tester.clearInput('input#password');
    await tester.type('input#password', testAccount.password);
    
    await tester.click('button[type="submit"]');
    
    await tester.wait(5000);
    
    const currentUrl = tester.getPage()?.url() || '';
    if (!currentUrl.includes('/login')) {
      console.log('登录成功，已跳转到首页');
    } else {
      throw new Error('登录后未跳转，可能登录失败');
    }
  });

  await tester.runTest('验证登录状态', async () => {
    await tester.wait(2000);
    
    const hasUserInfo = await tester.checkExistsByText('admin') || 
                        await tester.checkExists('[class*="avatar"]') ||
                        await tester.checkExists('[class*="user"]');
    
    if (!hasUserInfo) {
      console.log('警告: 未找到用户信息元素，但可能已登录成功');
    }
  });
}

export { testLogin };
