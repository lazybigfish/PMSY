import puppeteer, { Browser, Page, ConsoleMessage } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
}

interface ConsoleError {
  type: string;
  message: string;
  url: string;
  timestamp: string;
  stackTrace?: string;
}

interface TestReport {
  startTime: string;
  endTime: string;
  totalDuration: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  consoleErrors: ConsoleError[];
  fixes: string[];
}

class AutomatedBrowserTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private results: TestResult[] = [];
  private consoleErrors: ConsoleError[] = [];
  private fixes: string[] = [];
  private baseUrl: string;
  private testAccount: { username: string; password: string };
  private reportDir: string;
  private screenshotsDir: string;

  constructor() {
    this.baseUrl = 'http://localhost:5173';
    this.testAccount = {
      username: 'admin',
      password: 'Willyou@2026'
    };
    this.reportDir = path.join(process.cwd(), '.agent', 'records', this.getDateString());
    this.screenshotsDir = path.join(this.reportDir, 'screenshots');
    this.ensureDirectories();
  }

  private getDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  async init(): Promise<void> {
    console.log('🚀 启动浏览器...');
    
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];

    let executablePath = '';
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    if (!executablePath) {
      throw new Error('未找到 Chrome 浏览器，请确保已安装 Google Chrome');
    }

    this.browser = await puppeteer.launch({
      executablePath,
      headless: false,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    this.setupConsoleListener();
    console.log('✅ 浏览器启动成功');
  }

  private setupConsoleListener(): void {
    if (!this.page) return;

    this.page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        this.consoleErrors.push({
          type: msg.type(),
          message: msg.text(),
          url: this.page?.url() || '',
          timestamp: new Date().toISOString(),
          stackTrace: msg.stackTrace()?.map(s => s.toString()).join('\n')
        });
      }
    });

    this.page.on('pageerror', (error: Error) => {
      this.consoleErrors.push({
        type: 'pageerror',
        message: error.message,
        url: this.page?.url() || '',
        timestamp: new Date().toISOString(),
        stackTrace: error.stack
      });
    });
  }

  async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`\n📋 执行测试: ${testName}`);

    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        status: 'passed',
        duration
      });
      console.log(`✅ 测试通过: ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const screenshot = await this.takeScreenshot(testName);
      
      this.results.push({
        testName,
        status: 'failed',
        duration,
        error: errorMessage,
        screenshot
      });
      console.log(`❌ 测试失败: ${testName} - ${errorMessage}`);
    }
  }

  async takeScreenshot(name: string): Promise<string> {
    if (!this.page) return '';
    
    const filename = `${name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.png`;
    const filepath = path.join(this.screenshotsDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  }

  async waitForSelector(selector: string, timeout = 10000): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { timeout });
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { visible: true, timeout: 10000 });
    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { visible: true, timeout: 10000 });
    await this.page.type(selector, text);
  }

  async select(selector: string, value: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { visible: true, timeout: 10000 });
    await this.page.select(selector, value);
  }

  async getText(selector: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { timeout: 10000 });
    const element = await this.page.$(selector);
    if (!element) return '';
    return await element.evaluate(el => el.textContent || '');
  }

  async getValue(selector: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { timeout: 10000 });
    return await this.page.$eval(selector, el => (el as HTMLInputElement).value);
  }

  async checkExists(selector: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async clearInput(selector: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { visible: true, timeout: 10000 });
    await this.page.click(selector, { clickCount: 3 });
    await this.page.keyboard.press('Backspace');
  }

  async clickByText(text: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    const found = await this.page.evaluate((searchText) => {
      const xpath = `//*[contains(text(), '${searchText}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue as HTMLElement;
      if (element) {
        element.click();
        return true;
      }
      return false;
    }, text);
    if (!found) {
      throw new Error(`未找到包含文本 "${text}" 的元素`);
    }
  }

  async checkExistsByText(text: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate((searchText) => {
      const xpath = `//*[contains(text(), '${searchText}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue !== null;
    }, text);
  }

  async clickByButton(text: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    const found = await this.page.evaluate((searchText) => {
      const xpath = `//button[contains(text(), '${searchText}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue as HTMLElement;
      if (element) {
        element.click();
        return true;
      }
      return false;
    }, text);
    if (!found) {
      throw new Error(`未找到包含文本 "${text}" 的按钮`);
    }
  }

  async checkExistsByButton(text: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.evaluate((searchText) => {
      const xpath = `//button[contains(text(), '${searchText}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue !== null;
    }, text);
  }

  addFix(description: string): void {
    this.fixes.push(description);
    console.log(`🔧 记录修复: ${description}`);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('\n👋 浏览器已关闭');
    }
  }

  generateReport(): TestReport {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    return {
      startTime: this.results.length > 0 ? new Date().toISOString() : '',
      endTime: new Date().toISOString(),
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      totalTests: this.results.length,
      passed,
      failed,
      skipped,
      results: this.results,
      consoleErrors: this.consoleErrors,
      fixes: this.fixes
    };
  }

  saveReport(): string {
    const report = this.generateReport();
    const reportPath = path.join(this.reportDir, '自动化测试报告.md');
    
    let content = `# 项目管理模块自动化测试报告\n\n`;
    content += `**测试时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `## 测试概览\n\n`;
    content += `| 指标 | 数值 |\n`;
    content += `|------|------|\n`;
    content += `| 总测试数 | ${report.totalTests} |\n`;
    content += `| 通过 | ${report.passed} ✅ |\n`;
    content += `| 失败 | ${report.failed} ❌ |\n`;
    content += `| 跳过 | ${report.skipped} ⏭️ |\n`;
    content += `| 总耗时 | ${report.totalDuration}ms |\n\n`;

    content += `## 测试结果详情\n\n`;
    for (const result of report.results) {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      content += `### ${icon} ${result.testName}\n\n`;
      content += `- **状态**: ${result.status === 'passed' ? '通过' : result.status === 'failed' ? '失败' : '跳过'}\n`;
      content += `- **耗时**: ${result.duration}ms\n`;
      if (result.error) {
        content += `- **错误信息**: \n\`\`\`\n${result.error}\n\`\`\`\n`;
      }
      if (result.screenshot) {
        content += `- **截图**: ${result.screenshot}\n`;
      }
      content += `\n`;
    }

    if (report.consoleErrors.length > 0) {
      content += `## 控制台错误\n\n`;
      for (const error of report.consoleErrors) {
        content += `### ${error.type}\n\n`;
        content += `- **时间**: ${error.timestamp}\n`;
        content += `- **页面**: ${error.url}\n`;
        content += `- **消息**: \n\`\`\`\n${error.message}\n\`\`\`\n`;
        if (error.stackTrace) {
          content += `- **堆栈**: \n\`\`\`\n${error.stackTrace}\n\`\`\`\n`;
        }
        content += `\n`;
      }
    }

    if (report.fixes.length > 0) {
      content += `## 修复记录\n\n`;
      for (const fix of report.fixes) {
        content += `- ${fix}\n`;
      }
      content += `\n`;
    }

    fs.writeFileSync(reportPath, content, 'utf-8');
    console.log(`\n📄 测试报告已保存: ${reportPath}`);
    return reportPath;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getTestAccount(): { username: string; password: string } {
    return this.testAccount;
  }

  getPage(): Page | null {
    return this.page;
  }
}

export { AutomatedBrowserTester };
