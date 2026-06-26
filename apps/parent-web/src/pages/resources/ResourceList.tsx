import { useState, useEffect } from 'react';
import {
  Card,
  Select,
  Button,
  Spin,
  Typography,
  Empty,
  Row,
  Col,
  Tag,
  Space,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import client from '@/api/client';

const { Title } = Typography;

interface Resource {
  id: string;
  title: string;
  type: '视频' | '音频' | '文档' | '游戏' | string;
  type_desc: string;
  suitable_info: string;
}

const RESOURCE_TYPES = [
  { label: '全部', value: 'all' },
  { label: '视频', value: '视频' },
  { label: '音频', value: '音频' },
  { label: '文档', value: '文档' },
  { label: '游戏', value: '游戏' },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case '视频':
      return 'red';
    case '音频':
      return 'orange';
    case '文档':
      return 'blue';
    case '游戏':
      return 'green';
    default:
      return 'default';
  }
};

export default function ResourceList() {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await client.get('/resources');
      setResources(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const filteredResources =
    typeFilter === 'all'
      ? resources
      : resources.filter((r) => r.type === typeFilter);

  const handleDownload = (id: string) => {
    window.open(`${import.meta.env.VITE_API_BASE || ''}/resources/${id}/download`, '_blank');
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
          学习资源
        </Title>
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 150 }}
          options={RESOURCE_TYPES}
        />
      </div>

      {/* 网格布局列表 */}
      <Spin spinning={loading}>
        {filteredResources.length === 0 ? (
          <Empty description="暂无学习资源" />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredResources.map((resource) => (
              <Col key={resource.id} xs={24} sm={12} lg={8}>
                <Card
                  hoverable
                  bodyStyle={{ padding: 16 }}
                  actions={[
                    <Button
                      key="download"
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(resource.id)}
                      block
                    >
                      下载
                    </Button>,
                  ]}
                >
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        marginBottom: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      {resource.title}
                    </div>
                    <Space size={8} wrap>
                      <Tag color={getTypeColor(resource.type)}>{resource.type}</Tag>
                    </Space>
                  </div>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                    {resource.type_desc}
                  </div>
                  <div style={{ color: '#999', fontSize: 12 }}>
                    {resource.suitable_info}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </div>
  );
}
