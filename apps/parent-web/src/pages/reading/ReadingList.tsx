import { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Button,
  Spin,
  Progress,
  Typography,
  Empty,
  message,
  Space,
  Tag,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import client, { extractError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const { Title } = Typography;

interface ReadingMaterial {
  id: string;
  title: string;
  cefr_level: string;
  suitable_info: string;
  initial: string;
}

interface ReadingProgressItem {
  material_id: string;
  status: string; // 'in_progress' | 'completed'
  progress_percentage: number;
}

interface MergedItem extends ReadingMaterial {
  progress: number;
  status: string;
}

const CEFR_LEVELS = ['starter', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function ReadingList() {
  const { user } = useAuthStore();
  const childId = user?.childId || user?.child_id;

  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<MergedItem[]>([]);
  const [cefrFilter, setCefrFilter] = useState<string | undefined>(undefined);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const [materialsRes, progressRes] = await Promise.all([
        client.get('/reading/materials', {
          params: cefrFilter ? { cefr_level: cefrFilter } : {},
        }),
        client.get('/reading/progress', { params: { child_id: String(childId) } }),
      ]);

      const matItems: ReadingMaterial[] = materialsRes.data?.items || [];
      const progItems: ReadingProgressItem[] = progressRes.data?.items || [];
      const progMap = new Map(progItems.map((p) => [p.material_id, p]));

      const merged: MergedItem[] = matItems.map((m) => {
        const p = progMap.get(m.id);
        return {
          ...m,
          progress: p?.progress_percentage || 0,
          status: p?.status || 'not_started',
        };
      });

      setMaterials(merged);
    } catch (err) {
      message.error(extractError(err, '获取阅读材料失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [childId, cefrFilter]);

  const handleComplete = async (materialId: string) => {
    if (!childId) return;
    setCompletingId(materialId);
    try {
      await client.put('/reading/progress', {
        child_id: childId,
        material_id: materialId,
        status: 'completed',
      });
      message.success('标记完成！');
      fetchData();
    } catch (err) {
      message.error(extractError(err, '标记失败'));
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部标题 + 筛选 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          阅读材料
        </Title>
        <Select
          placeholder="筛选 CEFR 级别"
          allowClear
          style={{ width: 180 }}
          value={cefrFilter}
          onChange={setCefrFilter}
          options={CEFR_LEVELS.map((l) => ({ label: l, value: l }))}
        />
      </div>

      {/* 卡片列表 */}
      <Spin spinning={loading}>
        {materials.length === 0 ? (
          <Empty description="暂无阅读材料" />
        ) : (
          <Space direction="vertical" size={16} style={{ display: 'flex' }}>
            {materials.map((item) => (
              <Card key={item.id} bodyStyle={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* 字母方块 */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: '#F4A230',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 20,
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {item.initial || item.title.charAt(0).toUpperCase()}
                  </div>

                  {/* 文字信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                      {item.title}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
                      适合级别: {item.cefr_level} · {item.suitable_info}
                    </div>
                    <Progress
                      percent={item.progress}
                      strokeColor="#F4A230"
                      trailColor="#FFF3E0"
                      size="small"
                      showInfo
                    />
                  </div>

                  {/* 标记完成按钮 */}
                  <div style={{ flexShrink: 0 }}>
                    {item.status === 'completed' ? (
                      <Tag color="success">已完成</Tag>
                    ) : (
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        loading={completingId === item.id}
                        onClick={() => handleComplete(item.id)}
                      >
                        标记完成
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Spin>
    </div>
  );
}
