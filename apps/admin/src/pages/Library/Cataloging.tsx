import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, InputNumber, Switch, Button, Row, Col, Space, Typography, Spin, message, Tag } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMaterialDetail, createMaterial, updateMaterial } from '../../services/reading';
import { getResourceDetail, createResource, updateResource } from '../../services/resource';
import { LIBRARY_OPTIONS, LEVEL_OPTIONS, AUDIENCE_OPTIONS, LIBRARY_LABELS } from '../../library/adapter';
import type { LibraryType, MaterialLevel } from '../../library/adapter';

const { TextArea } = Input;
const { Title } = Typography;

/** 不同馆对应的分区选项 */
const COLLECTION_MAP: Record<LibraryType, { value: string; label: string }[]> = {
  reading: [
    { value: 'graded', label: '分级阅读' },
    { value: 'phonics', label: 'Phonics 区' },
    { value: 'wordcard', label: '词卡区' },
  ],
  teaching: [
    { value: 'lesson_plan', label: '教案' },
    { value: 'class_activity', label: '课堂活动' },
    { value: 'practice', label: '家庭练习' },
  ],
  parent_support: [
    { value: 'guide', label: '家长指南' },
  ],
  curation: [
    { value: 'curation', label: '专题推荐' },
  ],
};

/** 分区→分类 自动映射 */
const CATEGORY_MAP: Record<string, { value: string; label: string }[]> = {
  graded: [
    { value: 'picture_book', label: '绘本' },
    { value: 'story', label: '故事' },
    { value: 'short_text', label: '短文' },
    { value: 'read_aloud', label: '跟读' },
  ],
  phonics: [{ value: 'phonics', label: 'Phonics' }],
  wordcard: [{ value: 'word_card', label: '词卡' }],
  lesson_plan: [{ value: 'phonics', label: 'Phonics' }, { value: 'word_card', label: '词卡' }, { value: 'recommended', label: '推荐' }],
  class_activity: [{ value: 'phonics', label: 'Phonics' }, { value: 'word_card', label: '词卡' }],
  practice: [{ value: 'word_card', label: '词卡' }],
  guide: [{ value: 'recommended', label: '推荐' }],
  curation: [{ value: 'recommended', label: '推荐' }],
};

export default function LibraryCataloging() {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('id');
  const editSource = searchParams.get('source');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [library, setLibrary] = useState<LibraryType>('reading');
  const [collection, setCollection] = useState('graded');

  useEffect(() => {
    if (editId && editSource) {
      setLoading(true);
      const fetchFn = editSource === 'reading'
        ? getMaterialDetail(editId).then(m => ({ ...m, _source: 'reading' }))
        : getResourceDetail(editId).then(r => ({ ...r, _source: 'resource' }));
      fetchFn.then((data: any) => {
        // Determine library from source
        const lib: LibraryType = data._source === 'reading' ? 'reading' : 'teaching';
        setLibrary(lib);
        form.setFieldsValue({
          title: data.title,
          library: lib,
          // level only for reading
          level: data.level,
          category: data.category,
          sort_order: data.sort_order,
          is_active: data.is_active,
        });
      }).catch(() => message.error('加载失败')).finally(() => setLoading(false));
    }
  }, [editId, editSource]);

  const onSubmit = async (values: any) => {
    setSaving(true);
    try {
      if (values.library === 'reading') {
        const params: any = {
          title: values.title,
          level: values.level,
          category: values.category,
          pdf_url: 'pending_upload',
          sort_order: values.sort_order || 0,
          is_active: values.is_active ?? true,
        };
        if (editId && editSource === 'reading') {
          await updateMaterial(editId, params);
          message.success('编目更新成功');
        } else {
          await createMaterial(params);
          message.success('编目创建成功');
        }
      } else {
        const cat = values.category || 'phonics';
        const params: any = {
          title: values.title,
          category: cat,
          pdf_url: 'pending_upload',
          sort_order: values.sort_order || 0,
          is_active: values.is_active ?? true,
        };
        if (editId && editSource === 'resource') {
          await updateResource(editId, params);
          message.success('编目更新成功');
        } else {
          await createResource(params);
          message.success('编目创建成功');
        }
      }
      navigate('/library/catalog');
    } catch (e: any) {
      message.error(e?.response?.data?.detail?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/library/catalog')}>返回</Button>
        <Title level={4} style={{ margin: 0 }}>{editId ? '编辑编目' : '新建编目'}</Title>
      </div>

      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ library: 'reading', is_active: true, sort_order: 0 }}>
        {/* ── 基本信息 ── */}
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                <Input placeholder="资源标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subtitle" label={<span>副标题 <Tag color="orange">TODO</Tag></span>}>
                <Input placeholder="可选" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="summary" label={<span>简短简介 <Tag color="orange">TODO</Tag></span>}>
            <TextArea rows={2} placeholder="一句话介绍此资源" disabled />
          </Form.Item>
        </Card>

        {/* ── 分类信息 ── */}
        <Card title="分类信息" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="library" label="所属馆" rules={[{ required: true }]}>
                <Select options={LIBRARY_OPTIONS} onChange={(v: LibraryType) => { setLibrary(v); setCollection(''); form.setFieldsValue({ collection: undefined, category: undefined }); }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="collection" label="分区">
                <Select options={COLLECTION_MAP[library] || []} value={collection || undefined} onChange={(v: string) => { setCollection(v); form.setFieldsValue({ category: undefined }); }} placeholder="选择分区" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
                <Select options={CATEGORY_MAP[collection] || CATEGORY_MAP['graded']} placeholder="选择分类" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="level" label="级别" rules={library === 'reading' ? [{ required: true, message: '阅读馆必选' }] : []}>
                <Select options={LEVEL_OPTIONS} placeholder={library === 'reading' ? '选择级别' : '仅阅读馆'} disabled={library !== 'reading'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tags" label={<span>标签 <Tag color="orange">TODO</Tag></span>}>
                <Select mode="tags" placeholder="暂不可用" disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="audience" label={<span>适用对象 <Tag color="orange">TODO</Tag></span>}>
                <Select options={AUDIENCE_OPTIONS} placeholder="暂不可用" disabled />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ── 文件信息 ── */}
        <Card title="文件信息" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cover_url" label={<span>封面 URL <Tag color="orange">TODO</Tag></span>}>
                <Input placeholder="暂不可用" disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="page_count" label="页数">
                <InputNumber min={0} placeholder="自动检测" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Typography.Text type="secondary">
            💡 PDF 文件请在保存编目后，通过馆藏目录页的"上传PDF"按钮上传。
          </Typography.Text>
        </Card>

        {/* ── 发布信息 ── */}
        <Card title="发布信息" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="sort_order" label="排序权重">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_active" label="上架" valuePropName="checked">
                <Switch checkedChildren="上架" unCheckedChildren="下架" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_featured" label={<span>推荐 <Tag color="orange">TODO</Tag></span>}>
                <Switch checkedChildren="推荐" unCheckedChildren="普通" disabled />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              {editId ? '保存修改' : '创建编目'}
            </Button>
            <Button onClick={() => navigate('/library/catalog')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
