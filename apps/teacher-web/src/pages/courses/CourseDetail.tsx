import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Descriptions, Divider, Alert } from 'antd';
import { ArrowLeftOutlined, FormOutlined, LinkOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import type { CourseDetail } from '../../types';
import { StatusTag, AvatarName, LoadingPage, ErrorBanner } from '../../components/shared';
import FeedbackModal from '../../components/FeedbackModal';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Auto-open feedback if navigated with state
  useEffect(() => {
    if (location.state?.openFeedback) {
      setFeedbackOpen(true);
    }
  }, [location.state]);

  const fetchCourse = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/courses/${id}`);
      setCourse(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchCourse(); }, [id]);

  if (loading) return <LoadingPage rows={6} />;
  if (error) return <div style={{ padding: 24 }}><ErrorBanner message={error} onRetry={fetchCourse} /></div>;
  if (!course) return <div style={{ padding: 24 }}><ErrorBanner message="Course not found" /></div>;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ padding: 0, color: '#64748B' }}
        />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A2B4A', margin: 0 }}>
          Course Detail
        </h1>
      </div>

      {/* Course Info Card */}
      <Card style={{ marginBottom: 20, borderRadius: 8 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} size="middle">
          <Descriptions.Item label="Date">{course.date}</Descriptions.Item>
          <Descriptions.Item label="Time">{course.start_time} – {course.end_time}</Descriptions.Item>
          <Descriptions.Item label="Status"><StatusTag status={course.status} /></Descriptions.Item>
          {course.meeting_link && (
            <Descriptions.Item label="Meeting Link">
              <a href={course.meeting_link} target="_blank" rel="noopener noreferrer" style={{ color: '#5CAADF' }}>
                <LinkOutlined /> Join Meeting
              </a>
            </Descriptions.Item>
          )}
          {course.teacher && (
            <Descriptions.Item label="Teacher">
              <AvatarName name={course.teacher.name} size={28} />
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider style={{ margin: '16px 0' }} />

        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A2B4A', marginBottom: 8 }}>
            Students ({course.children?.length || 0})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {course.children?.map(child => (
              <AvatarName key={child.id} name={child.name} size={28} />
            ))}
            {(!course.children || course.children.length === 0) && (
              <span style={{ fontSize: 13, color: '#94A3B8' }}>No students enrolled</span>
            )}
          </div>
        </div>
      </Card>

      {/* Feedback Section */}
      <Card style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1A2B4A', margin: 0 }}>Feedback</h2>
          {course.status === 'completed' && !course.feedback && (
            <Button
              type="primary"
              icon={<FormOutlined />}
              onClick={() => setFeedbackOpen(true)}
            >
              Submit Feedback
            </Button>
          )}
        </div>

        {course.feedback ? (
          <div>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Content">{course.feedback.content}</Descriptions.Item>
              {course.feedback.homework && (
                <Descriptions.Item label="Homework">{course.feedback.homework}</Descriptions.Item>
              )}
              {course.feedback.notes && (
                <Descriptions.Item label="Notes">{course.feedback.notes}</Descriptions.Item>
              )}
              <Descriptions.Item label="By">{course.feedback.teacher?.name}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 14 }}>
            {course.status === 'completed'
              ? 'No feedback yet. Click "Submit Feedback" to add one.'
              : 'Feedback is available after the class is completed.'
            }
          </div>
        )}
      </Card>

      {/* Feedback Modal */}
      {id && (
        <FeedbackModal
          courseId={id}
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          onSuccess={fetchCourse}
        />
      )}
    </div>
  );
}
