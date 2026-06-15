/**
 * usePdfUploader — shared PDF upload hook for admin resource/reading pages.
 *
 * Encapsulates:
 * - Upload Modal open/close state
 * - File selection (Drag & drop or click) via antd Upload.Dragger
 * - PDF type + 50MB size validation (client-side)
 * - Progress tracking
 * - Upload execution via injected uploadFn
 *
 * Usage in parent:
 *
 *   const uploader = usePdfUploader({
 *     uploadFn: (file, onProgress) => uploadResourcePdf(idRef.current!, file, onProgress),
 *     successMessage: 'PDF 上传成功',
 *     onSuccess: fetchList,
 *   });
 *
 *   <Button onClick={() => {
 *     setIdForUpload(record.id);
 *     uploader.openUploadModal(record.title);
 *   }}>
 *
 *   <PdfUploadModal uploader={uploader} />
 */

import { useState, useCallback, useRef } from 'react';
import { message, Modal, Upload, Progress } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { AxiosError } from 'axios';

export interface UsePdfUploaderOptions {
  /** The upload API function: (file, onProgress) => Promise<Response> */
  uploadFn: (file: File, onProgress: (percent: number) => void) => Promise<unknown>;
  /** Success toast message */
  successMessage?: string;
  /** Called after successful upload (e.g. refresh list) */
  onSuccess?: () => void;
}

export interface UsePdfUploaderReturn {
  uploadModalOpen: boolean;
  uploading: boolean;
  uploadProgress: number;
  fileList: UploadFile[];
  setFileList: (files: UploadFile[]) => void;
  uploadTitle: string;
  openUploadModal: (title: string) => void;
  closeUploadModal: () => void;
  handleUploadSubmit: () => Promise<boolean>;
}

export function usePdfUploader(options: UsePdfUploaderOptions): UsePdfUploaderReturn {
  const { uploadFn, successMessage = 'PDF 上传成功', onSuccess } = options;

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  // Track upload status via ref to avoid stale closure issues in closeUploadModal
  const uploadingRef = useRef(false);

  const openUploadModal = useCallback((title: string) => {
    setUploadTitle(title);
    setUploadProgress(0);
    setUploading(false);
    uploadingRef.current = false;
    setFileList([]);
    setUploadModalOpen(true);
  }, []);

  const closeUploadModal = useCallback(() => {
    if (!uploadingRef.current) {
      setUploadModalOpen(false);
    }
  }, []);

  const handleUploadSubmit = useCallback(async (): Promise<boolean> => {
    if (fileList.length === 0) {
      message.warning('请选择 PDF 文件');
      return false;
    }

    const file = fileList[0]?.originFileObj;
    if (!file) return false;

    setUploading(true);
    uploadingRef.current = true;
    setUploadProgress(0);
    try {
      await uploadFn(file, (percent) => {
        setUploadProgress(percent);
      });
      message.success(successMessage);
      setUploadModalOpen(false);
      setFileList([]);
      onSuccess?.();
      return true;
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: { message?: string } }>;
      message.error(axiosErr.response?.data?.detail?.message || '上传失败');
      return false;
    } finally {
      setUploading(false);
      uploadingRef.current = false;
    }
  }, [fileList, uploadFn, successMessage, onSuccess]);

  return {
    uploadModalOpen,
    uploading,
    uploadProgress,
    fileList,
    setFileList,
    uploadTitle,
    openUploadModal,
    closeUploadModal,
    handleUploadSubmit,
  };
}

// ── Shared Upload Modal component ──────────────────

interface PdfUploadModalProps {
  uploader: UsePdfUploaderReturn;
}

/**
 * Reusable PDF upload modal with Drag & drop area + progress bar.
 * Uses the provided usePdfUploader instance for state + actions.
 */
export const PdfUploadModal: React.FC<PdfUploadModalProps> = ({ uploader }) => {
  return (
    <Modal
      title={`上传 PDF — ${uploader.uploadTitle}`}
      open={uploader.uploadModalOpen}
      onOk={uploader.handleUploadSubmit}
      onCancel={uploader.closeUploadModal}
      okText="上传"
      cancelText="取消"
      confirmLoading={uploader.uploading}
      okButtonProps={{ disabled: uploader.fileList.length === 0 || uploader.uploading }}
      destroyOnClose
      width={480}
    >
      <Upload.Dragger
        accept=".pdf"
        maxCount={1}
        multiple={false}
        fileList={uploader.fileList}
        beforeUpload={(file) => {
          if (file.type !== 'application/pdf') {
            message.error('仅支持 PDF 文件');
            return Upload.LIST_IGNORE;
          }
          if (file.size > 50 * 1024 * 1024) {
            message.error('PDF 文件大小不能超过 50MB');
            return Upload.LIST_IGNORE;
          }
          uploader.setFileList([
            {
              uid: file.uid,
              name: file.name,
              status: 'done',
              originFileObj: file as unknown as File,
            } as UploadFile,
          ]);
          return false;
        }}
        onRemove={() => {
          uploader.setFileList([]);
        }}
      >
        <p className="ant-upload-drag-icon">
          <FilePdfOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        </p>
        <p className="ant-upload-text">点击或拖拽 PDF 文件到此区域</p>
        <p className="ant-upload-hint">仅支持 PDF 格式，单个文件不超过 50MB</p>
      </Upload.Dragger>

      {uploader.uploading && uploader.uploadProgress > 0 && (
        <Progress
          percent={uploader.uploadProgress}
          status={uploader.uploadProgress < 100 ? 'active' : 'success'}
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};