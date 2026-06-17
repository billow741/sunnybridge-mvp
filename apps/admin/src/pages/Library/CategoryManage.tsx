/**
 * 分类管理页 — 只读展示当前分类映射体系
 * MVP 阶段不允许后台增删分类, 仅展示常量配置
 */

import { Card, Table, Typography, Tag, Space, Alert } from 'antd';
import {
  DISPLAY_L2, VALID_CATEGORIES,
  CATEGORY_LABELS, TAG_POOL, LEVEL_OPTIONS,
} from '../../constants/resource';

const { Title } = Typography;

export default function CategoryManagePage() {
  // 构建映射表数据
  const mappingData: any[] = [];
  let idx = 0;
  for (const [module, cats] of Object.entries(VALID_CATEGORIES)) {
    cats.forEach(cat => {
      mappingData.push({
        key: `${module}-${cat}-${idx++}`,
        module: module === 'reading' ? '阅读材料' : '通用资源',
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
      });
    });
  }

  // 构建展示分类树
  const displayData: any[] = [];
  let dIdx = 0;
  for (const [l1, l2List] of Object.entries(DISPLAY_L2)) {
    displayData.push({
      key: `l1-${dIdx++}`,
      level: '一级',
      name: l1,
      type: '一级展示分类',
    });
    l2List.forEach(l2 => {
      displayData.push({
        key: `l2-${dIdx++}`,
        level: '二级',
        name: l2,
        type: '二级展示分类',
        parent: l1,
      });
    });
  }

  const catCols = [
    { title: '模块', dataIndex: 'module', key: 'module', width: 120 },
    { title: '原始分类值', dataIndex: 'category', key: 'category', width: 150,
      render: (v: string) => <Tag>{v}</Tag> },
    { title: '中文标签', dataIndex: 'label', key: 'label', width: 120 },
  ];

  const displayCols = [
    { title: '层级', dataIndex: 'level', key: 'level', width: 80,
      render: (v: string) => <Tag color={v === '一级' ? 'blue' : 'cyan'}>{v}</Tag> },
    { title: '分类名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '所属一级', dataIndex: 'parent', key: 'parent', width: 150,
      render: (v: string) => v || '—' },
    { title: '类型', dataIndex: 'type', key: 'type', width: 120 },
  ];

  return (
    <div>
      <Title level={4}>分类管理</Title>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="MVP 阶段分类为常量配置, 暂不支持后台增删。如需调整请联系开发修改 constants/resource.ts。"
      />

      <Card title="原始分类 → API 映射" style={{ marginBottom: 16 }}>
        <Table
          rowKey="key"
          columns={catCols}
          dataSource={mappingData}
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="展示分类体系 (一二级联动)" style={{ marginBottom: 16 }}>
        <Table
          rowKey="key"
          columns={displayCols}
          dataSource={displayData}
          pagination={false}
          size="small"
          indentSize={24}
        />
      </Card>

      <Card title="标签池">
        <Space wrap>
          {TAG_POOL.map(tag => <Tag key={tag}>{tag}</Tag>)}
        </Space>
      </Card>

      <Card title="级别选项 (阅读材料)" style={{ marginTop: 16 }}>
        <Space wrap>
          {LEVEL_OPTIONS.map(lv => <Tag key={lv.value} color="blue">{lv.label}</Tag>)}
        </Space>
      </Card>
    </div>
  );
}
