// Jest 测试环境设置

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.JWT_ISSUER = 'pmsy-api-test';
process.env.JWT_AUDIENCE = 'pmsy-client-test';

// 模拟 console 方法以清理测试输出
global.console = {
  ...console,
  // 在测试中可以选择性地禁用日志
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// 增加超时时间（如果需要）
jest.setTimeout(10000);
