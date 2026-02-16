import { AutomatedBrowserTester } from './AutomatedBrowserTester';
import { testLogin } from './testLogin';
import { testProjectList } from './testProjectList';
import { testProjectCreate } from './testProjectCreate';
import { testProjectOverview } from './testProjectOverview';
import { testFunctionalModules } from './testFunctionalModules';
import { testMilestones } from './testMilestones';
import { testRisks } from './testRisks';
import { testSuppliers } from './testSuppliers';
import { testReports } from './testReports';

async function main(): Promise<void> {
  const tester = new AutomatedBrowserTester();
  
  console.log('========================================');
  console.log('   项目管理模块自动化测试');
  console.log('========================================\n');

  try {
    await tester.init();
    
    console.log('\n--- 开始测试 ---\n');
    
    await testLogin(tester);
    await testProjectList(tester);
    await testProjectCreate(tester);
    await testProjectOverview(tester);
    await testFunctionalModules(tester);
    await testMilestones(tester);
    await testRisks(tester);
    await testSuppliers(tester);
    await testReports(tester);
    
    console.log('\n--- 测试完成 ---\n');
    
  } catch (error) {
    console.error('测试执行出错:', error);
  } finally {
    await tester.close();
    tester.saveReport();
    
    const report = tester.generateReport();
    console.log('\n========================================');
    console.log('   测试结果汇总');
    console.log('========================================');
    console.log(`总测试数: ${report.totalTests}`);
    console.log(`通过: ${report.passed} ✅`);
    console.log(`失败: ${report.failed} ❌`);
    console.log(`控制台错误: ${report.consoleErrors.length}`);
    console.log(`修复记录: ${report.fixes.length}`);
    console.log('========================================\n');
  }
}

main().catch(console.error);
