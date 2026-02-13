import * as dbService from '../../../src/services/dbService';
import { db } from '../../../src/config/database';

// Mock 数据库
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    whereNot: jest.fn().mockReturnThis(),
    whereLike: jest.fn().mockReturnThis(),
    whereILike: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
    count: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    raw: jest.fn(),
    transaction: jest.fn(),
  })),
}));

describe('DB Service', () => {
  const mockData = [
    { id: '1', name: 'Test 1', status: 'active' },
    { id: '2', name: 'Test 2', status: 'inactive' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query', () => {
    it('应该查询所有数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        whereNot: jest.fn().mockReturnThis(),
        whereLike: jest.fn().mockReturnThis(),
        whereILike: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockData),
      } as any);

      const result = await dbService.query('projects', {});
      expect(result).toEqual(mockData);
    });

    it('应该支持 select 参数', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockData),
      } as any);

      const result = await dbService.query('projects', { select: 'id,name' });
      expect(result).toEqual(mockData);
    });

    it('应该支持 eq 条件', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      const whereMock = jest.fn().mockReturnThis();
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: whereMock,
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockData),
      } as any);

      await dbService.query('projects', { eq: { status: 'active' } });
      expect(whereMock).toHaveBeenCalledWith('status', 'active');
    });

    it('应该支持 order 参数', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      const orderByMock = jest.fn().mockReturnThis();
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: orderByMock,
        limit: jest.fn().mockResolvedValue(mockData),
      } as any);

      await dbService.query('projects', { order: 'created_at.desc' });
      expect(orderByMock).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('应该支持 limit 和 offset 参数', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      const limitMock = jest.fn().mockReturnThis();
      const offsetMock = jest.fn().mockResolvedValue(mockData);
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: limitMock,
        offset: offsetMock,
      } as any);

      await dbService.query('projects', { limit: 10, offset: 20 });
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(offsetMock).toHaveBeenCalledWith(20);
    });
  });

  describe('queryOne', () => {
    it('应该返回单条数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockData[0]]),
      } as any);

      const result = await dbService.queryOne('projects', { eq: { id: '1' } });
      expect(result).toEqual(mockData[0]);
    });

    it('当数据不存在时应该返回 null', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await dbService.queryOne('projects', { eq: { id: '999' } });
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('应该根据 ID 查找数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockData[0]),
      } as any);

      const result = await dbService.findById('projects', '1');
      expect(result).toEqual(mockData[0]);
    });

    it('应该支持 select 参数', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      const selectMock = jest.fn().mockReturnThis();
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: selectMock,
        first: jest.fn().mockResolvedValue(mockData[0]),
      } as any);

      await dbService.findById('projects', '1', 'id,name');
      expect(selectMock).toHaveBeenCalledWith(['id', 'name']);
    });
  });

  describe('insert', () => {
    it('应该插入数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockData[0]]),
      } as any);

      const result = await dbService.insert('projects', { name: 'Test 1' });
      expect(result).toEqual(mockData[0]);
    });
  });

  describe('insertMany', () => {
    it('应该批量插入数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue(mockData),
      } as any);

      const result = await dbService.insertMany('projects', mockData);
      expect(result).toEqual(mockData);
    });
  });

  describe('update', () => {
    it('应该更新数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockData[0]]),
      } as any);

      const result = await dbService.update('projects', { name: 'Updated' }, { id: '1' });
      expect(result).toEqual([mockData[0]]);
    });
  });

  describe('updateById', () => {
    it('应该根据 ID 更新数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockData[0]]),
      } as any);

      const result = await dbService.updateById('projects', '1', { name: 'Updated' });
      expect(result).toEqual(mockData[0]);
    });

    it('当记录不存在时应该返回 null', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await dbService.updateById('projects', '999', { name: 'Updated' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('应该删除数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
      } as any);

      const result = await dbService.remove('projects', { id: '1' });
      expect(result).toBe(1);
    });
  });

  describe('removeById', () => {
    it('应该根据 ID 删除数据', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(1),
      } as any);

      const result = await dbService.removeById('projects', '1');
      expect(result).toBe(true);
    });

    it('当记录不存在时应该返回 false', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(0),
      } as any);

      const result = await dbService.removeById('projects', '999');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('应该返回数据数量', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '10' }),
      } as any);

      const result = await dbService.count('projects');
      expect(result).toBe(10);
    });

    it('应该支持条件', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      const whereMock = jest.fn().mockReturnThis();
      mockDb.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        where: whereMock,
        first: jest.fn().mockResolvedValue({ count: '5' }),
      } as any);

      const result = await dbService.count('projects', { status: 'active' });
      expect(result).toBe(5);
      expect(whereMock).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  describe('transaction', () => {
    it('应该执行事务', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      const trxMock = jest.fn();
      mockDb.mockReturnValue({
        transaction: jest.fn((callback) => callback(trxMock)),
      } as any);

      const callback = jest.fn().mockResolvedValue('result');
      const result = await dbService.transaction(callback);

      expect(result).toBe('result');
      expect(callback).toHaveBeenCalledWith(trxMock);
    });
  });

  describe('tableExists', () => {
    it('当表存在时应该返回 true', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        raw: jest.fn().mockResolvedValue({}),
      } as any);

      const result = await dbService.tableExists('projects');
      expect(result).toBe(true);
    });

    it('当表不存在时应该返回 false', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        raw: jest.fn().mockRejectedValue(new Error('Table not found')),
      } as any);

      const result = await dbService.tableExists('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getTableColumns', () => {
    it('应该返回表的列名', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        raw: jest.fn().mockResolvedValue({
          rows: [
            { column_name: 'id' },
            { column_name: 'name' },
            { column_name: 'status' },
          ],
        }),
      } as any);

      const result = await dbService.getTableColumns('projects');
      expect(result).toEqual(['id', 'name', 'status']);
    });
  });
});
