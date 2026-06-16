import { Spin } from 'antd';

export default function LoadingState({ tip = '加载中...' }: { tip?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 64 }}>
      <Spin size="large" tip={tip} />
    </div>
  );
}
