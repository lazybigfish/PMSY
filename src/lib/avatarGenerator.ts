/**
 * 随机抽象头像生成器
 * 基于用户ID生成唯一的几何抽象头像
 * 风格：几何抽象 + 流体渐变
 */

// 莫兰迪色系 - 柔和高级
const MORANDI_COLORS = [
  '#E8D5C4', '#D4E5ED', '#E5E0EC', '#D5E8D4',
  '#F5E6D3', '#D4E4D1', '#E1D5E7', '#D5E1E8',
  '#EDE8D5', '#D8D5E8', '#D5E8E0', '#E8D5DC',
];

// 活力渐变配色
const VIBRANT_GRADIENTS = [
  ['#FF6B6B', '#4ECDC4'],
  ['#A8EDEA', '#FED6E3'],
  ['#FFD93D', '#FF6B6B'],
  ['#6C5CE7', '#A29BFE'],
  ['#FD79A8', '#FDCB6E'],
  ['#00B894', '#00CEC9'],
  ['#E17055', '#FAB1A0'],
  ['#74B9FF', '#0984E3'],
];

// 深色模式配色
const DARK_COLORS = [
  '#1A1A2E', '#16213E', '#0F3460', '#E94560',
  '#533483', '#F39422', '#16C79A', '#EF476F',
];

// 几何形状类型
const SHAPE_TYPES = ['circle', 'rect', 'triangle', 'ellipse', 'polygon'] as const;

interface AvatarConfig {
  seed: string;
  size?: number;
  style?: 'morandi' | 'vibrant' | 'dark';
}

interface Shape {
  type: typeof SHAPE_TYPES[number];
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  opacity: number;
}

/**
 * 简单的字符串哈希函数
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * 伪随机数生成器（基于种子）
 */
function createRandom(seed: number) {
  return function(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * 从数组中随机选择
 */
function randomPick<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * 生成随机形状
 */
function generateShapes(seed: number, style: 'morandi' | 'vibrant' | 'dark'): Shape[] {
  const random = createRandom(seed);
  const shapes: Shape[] = [];
  const numShapes = 3 + Math.floor(random() * 4); // 3-6个形状

  let colors: string[];
  let gradientColors: string[][] = [];

  switch (style) {
    case 'morandi':
      colors = MORANDI_COLORS;
      break;
    case 'vibrant':
      colors = VIBRANT_GRADIENTS.flat();
      gradientColors = VIBRANT_GRADIENTS;
      break;
    case 'dark':
      colors = DARK_COLORS;
      break;
    default:
      colors = MORANDI_COLORS;
  }

  for (let i = 0; i < numShapes; i++) {
    const type = randomPick(SHAPE_TYPES, random);
    const shape: Shape = {
      type,
      x: 10 + random() * 60, // 10-70%
      y: 10 + random() * 60,
      size: 15 + random() * 35, // 15-50%
      rotation: random() * 360,
      color: randomPick(colors, random),
      opacity: 0.4 + random() * 0.4, // 0.4-0.8
    };
    shapes.push(shape);
  }

  return shapes;
}

/**
 * 生成SVG路径
 */
function generateShapeSVG(shape: Shape): string {
  const { type, x, y, size, rotation, color, opacity } = shape;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const transform = `rotate(${rotation} ${centerX} ${centerY})`;

  switch (type) {
    case 'circle':
      return `<circle cx="${centerX}" cy="${centerY}" r="${size / 2}" fill="${color}" opacity="${opacity}" transform="${transform}" />`;
    
    case 'rect':
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.2}" fill="${color}" opacity="${opacity}" transform="${transform}" />`;
    
    case 'triangle': {
      const half = size / 2;
      const points = `${centerX},${y} ${x},${y + size} ${x + size},${y + size}`;
      return `<polygon points="${points}" fill="${color}" opacity="${opacity}" transform="${transform}" />`;
    }
    
    case 'ellipse':
      return `<ellipse cx="${centerX}" cy="${centerY}" rx="${size / 2}" ry="${size / 3}" fill="${color}" opacity="${opacity}" transform="${transform}" />`;
    
    case 'polygon': {
      // 六边形
      const r = size / 2;
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 30) * Math.PI / 180;
        points.push(`${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`);
      }
      return `<polygon points="${points.join(' ')}" fill="${color}" opacity="${opacity}" transform="${transform}" />`;
    }
    
    default:
      return '';
  }
}

/**
 * 生成背景渐变
 */
function generateBackground(seed: number, style: 'morandi' | 'vibrant' | 'dark'): string {
  const random = createRandom(seed);
  
  if (style === 'vibrant') {
    const gradient = VIBRANT_GRADIENTS[Math.floor(random() * VIBRANT_GRADIENTS.length)];
    const angle = Math.floor(random() * 360);
    return `linear-gradient(${angle}deg, ${gradient[0]}, ${gradient[1]})`;
  }
  
  const colors = style === 'dark' ? DARK_COLORS : MORANDI_COLORS;
  const color1 = randomPick(colors, random);
  const color2 = randomPick(colors, random);
  const angle = Math.floor(random() * 360);
  return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
}

/**
 * 生成抽象头像 SVG
 */
export function generateAvatarSVG(config: AvatarConfig): string {
  const { seed, size = 200, style = 'morandi' } = config;
  const hash = hashString(seed);
  const shapes = generateShapes(hash, style);
  
  // 生成背景
  const bgColor = style === 'dark' ? '#1A1A2E' : '#FAFAFA';
  
  // 生成形状SVG
  const shapesSVG = shapes.map(generateShapeSVG).join('\n  ');
  
  // 添加装饰性元素
  const random = createRandom(hash);
  const hasOverlay = random() > 0.5;
  const overlaySVG = hasOverlay ? `
  <circle cx="80" cy="80" r="40" fill="url(#overlay)" opacity="0.3" />
  <defs>
    <radialGradient id="overlay" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="white" stop-opacity="0.5" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </radialGradient>
  </defs>` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="${bgColor}" />
  ${shapesSVG}
  ${overlaySVG}
</svg>`;
}

/**
 * 生成头像 Data URL
 */
export function generateAvatarDataURL(config: AvatarConfig): string {
  const svg = generateAvatarSVG(config);
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * 生成多个头像选项
 */
export function generateAvatarOptions(
  baseSeed: string,
  count: number = 6,
  size: number = 200
): Array<{ url: string; seed: string; style: 'morandi' | 'vibrant' | 'dark' }> {
  const styles: Array<'morandi' | 'vibrant' | 'dark'> = ['morandi', 'vibrant', 'dark'];
  const options = [];
  
  for (let i = 0; i < count; i++) {
    const style = styles[i % styles.length];
    const seed = `${baseSeed}-${i}-${Date.now()}`;
    const url = generateAvatarDataURL({ seed, size, style });
    options.push({ url, seed, style });
  }
  
  return options;
}

/**
 * 根据用户ID生成默认头像
 */
export function generateDefaultAvatar(userId: string, size: number = 200): string {
  // 根据用户ID选择风格
  const hash = hashString(userId);
  const styles: Array<'morandi' | 'vibrant' | 'dark'> = ['morandi', 'vibrant', 'dark'];
  const style = styles[hash % styles.length];
  
  return generateAvatarDataURL({ seed: userId, size, style });
}

/**
 * 重新随机生成头像
 */
export function regenerateAvatar(
  baseSeed: string,
  style?: 'morandi' | 'vibrant' | 'dark'
): { url: string; seed: string } {
  const newSeed = `${baseSeed}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const hash = hashString(newSeed);
  const styles: Array<'morandi' | 'vibrant' | 'dark'> = ['morandi', 'vibrant', 'dark'];
  const selectedStyle = style || styles[hash % styles.length];
  
  return {
    url: generateAvatarDataURL({ seed: newSeed, size: 200, style: selectedStyle }),
    seed: newSeed,
  };
}

export type { AvatarConfig, Shape };
