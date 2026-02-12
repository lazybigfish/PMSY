import jwt from 'jsonwebtoken';

// 使用与服务器相同的 JWT_SECRET
const JWT_SECRET = 'your-super-secret-jwt-token-with-at-least-32-characters-long';

// 生成 Anon Key (public)
const anonPayload = {
  iss: 'supabase',
  ref: 'pmsy',
  role: 'anon',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 315360000 // 10年
};

// 生成 Service Role Key (secret)
const serviceRolePayload = {
  iss: 'supabase',
  ref: 'pmsy',
  role: 'service_role',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 315360000 // 10年
};

const anonKey = jwt.sign(anonPayload, JWT_SECRET);
const serviceRoleKey = jwt.sign(serviceRolePayload, JWT_SECRET);

console.log('=== 生成的 JWT Token ===');
console.log('');
console.log('ANON_KEY:');
console.log(anonKey);
console.log('');
console.log('SERVICE_ROLE_KEY:');
console.log(serviceRoleKey);
console.log('');
console.log('=== 验证 Token ===');
console.log('Anon decoded:', jwt.verify(anonKey, JWT_SECRET));
console.log('Service Role decoded:', jwt.verify(serviceRoleKey, JWT_SECRET));
