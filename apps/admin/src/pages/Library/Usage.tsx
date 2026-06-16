import React from 'react';
import { Card, Row, Col, Empty, Typography } from 'antd';
import { BarChartOutlined, ReadOutlined, TeamOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function LibraryUsage() {
  return (
    <div>
      <Title level={4}>使用记录</Title>
      <Paragraph type="secondary">
        资源馆使用统计和阅读记录概览
      </Paragraph>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={<><EyeOutlined /> 资源浏览排行</>} style={{ marginBottom: 16 }}>
            <Empty
              description={
                <span>
                  <Text type="secondary">TODO: 需要后端增加资源访问计数</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    新增 view_count 字段到 readingmaterials / resources 表，
                    或新增 resource_views 日志表
                  </Text>
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<><BarChartOutlined /> 阅读完成率</>} style={{ marginBottom: 16 }}>
            <Empty
              description={
                <span>
                  <Text type="secondary">TODO: 聚合 readingprogress 数据</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    按 level 统计 completed=true 的比率，
                    GET /api/v1/reading/progress 已有接口
                  </Text>
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={<><TeamOutlined /> 家庭阅读摘要</>} style={{ marginBottom: 16 }}>
            <Empty
              description={
                <span>
                  <Text type="secondary">TODO: 按孩子/家庭汇总阅读记录</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    聚合 readingprogress 按 child_id 分组，
                    显示每个孩子的已读/未读/完成数
                  </Text>
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<><ReadOutlined /> 最近阅读活动</>} style={{ marginBottom: 16 }}>
            <Empty
              description={
                <span>
                  <Text type="secondary">TODO: 最近 50 条阅读记录</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    GET /api/v1/reading/progress?limit=50&sort=last_read_at
                  </Text>
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ background: '#fafafa' }}>
        <Text type="secondary">
          💡 使用记录模块需要在后端补充资源访问统计接口。当前保留页面结构，
          等后端补充 view_count / 聚合 API 后即可填充数据。
        </Text>
      </Card>
    </div>
  );
}
