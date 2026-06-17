/**
 * 推荐配置页 — MVP 占位
 * 后续实现: 推荐位管理、排序、定时发布
 */

import { Card, Result } from 'antd';
import { StarOutlined } from '@ant-design/icons';

export default function CurationPage() {
  return (
    <Card>
      <Result
        icon={<StarOutlined style={{ color: '#faad14' }} />}
        title="推荐配置"
        subTitle="MVP 阶段暂未开放, 可通过「资源列表」将资源设置为推荐(recommended)分类"
      />
    </Card>
  );
}
