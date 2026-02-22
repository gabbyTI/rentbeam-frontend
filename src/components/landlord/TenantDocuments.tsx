import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { TenantDocument, DocumentType } from '../../types';
import * as api from '../../services/api';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
    LEASE: 'Lease Agreement',
    MOVE_IN_INSPECTION: 'Move-in Inspection',
    MOVE_OUT_INSPECTION: 'Move-out Inspection',
    NOTICE: 'Notice',
    ID_VERIFICATION: 'ID Verification',
    OTHER: 'Other',
};

const DOC_TYPE_ICONS: Record<DocumentType, string> = {
    LEASE: '📄',
    MOVE_IN_INSPECTION: '🔑',
    MOVE_OUT_INSPECTION: '🚪',
    NOTICE: '📬',
    ID_VERIFICATION: '🪪',
    OTHER: '📎',
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TenantDocumentsProps {
    tenantMembershipId: string;
    isLandlord: boolean;
}

export const TenantDocuments: React.FC<TenantDocumentsProps> = ({
    tenantMembershipId,
    isLandlord,
}) => {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [documents, setDocuments] = useState<TenantDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadType, setUploadType] = useState<DocumentType>('LEASE');
    const [uploadNotes, setUploadNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchDocs = async () => {
        try {
            const docs = await api.getTenantDocuments(tenantMembershipId);
            setDocuments(docs);
        } catch {
            // silently fail on background refresh
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, [tenantMembershipId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            showToast('Please select a file', 'error');
            return;
        }
        setUploading(true);
        try {
            // Step 1: Get presigned PUT URL
            const { uploadUrl, fileKey } = await api.getDocumentUploadUrl(
                tenantMembershipId,
                selectedFile.name,
                selectedFile.type,
                selectedFile.size
            );

            // Step 2: Upload file directly to MinIO/S3
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': selectedFile.type },
                body: selectedFile,
            });

            if (!uploadResponse.ok) {
                throw new Error('File upload to storage failed');
            }

            // Step 3: Confirm with backend
            await api.confirmDocumentUpload(tenantMembershipId, {
                fileKey,
                fileName: selectedFile.name,
                type: uploadType,
                fileSize: selectedFile.size,
                mimeType: selectedFile.type,
                notes: uploadNotes || undefined,
            });

            showToast('Document uploaded successfully');
            setShowUploadForm(false);
            setSelectedFile(null);
            setUploadNotes('');
            setUploadType('LEASE');
            if (fileInputRef.current) fileInputRef.current.value = '';
            await fetchDocs();
        } catch (err: any) {
            showToast(err.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc: TenantDocument) => {
        try {
            const { url } = await api.getDocumentDownloadUrl(tenantMembershipId, doc.id);
            window.open(url, '_blank');
        } catch {
            showToast('Failed to get download link', 'error');
        }
    };

    const handleDelete = async (doc: TenantDocument) => {
        if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
        setDeletingId(doc.id);
        try {
            await api.deleteTenantDocument(tenantMembershipId, doc.id);
            showToast('Document deleted');
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch {
            showToast('Failed to delete document', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Documents</h3>
                {isLandlord && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowUploadForm((v) => !v)}
                    >
                        {showUploadForm ? 'Cancel' : '+ Upload'}
                    </Button>
                )}
            </div>

            {/* Upload Form */}
            {showUploadForm && isLandlord && (
                <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
                        <select
                            value={uploadType}
                            onChange={(e) => setUploadType(e.target.value as DocumentType)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((t) => (
                                <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">File <span className="text-gray-400">(PDF, JPEG, PNG — max 20 MB)</span></label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                        <input
                            type="text"
                            value={uploadNotes}
                            onChange={(e) => setUploadNotes(e.target.value)}
                            placeholder="e.g. Signed lease Jan 2026"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <Button onClick={handleUpload} disabled={uploading || !selectedFile} size="sm" className="w-full">
                        {uploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                </div>
            )}

            {/* Document List */}
            {loading ? (
                <p className="text-sm text-gray-400 py-3 text-center">Loading documents...</p>
            ) : documents.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center">No documents yet</p>
            ) : (
                <div className="space-y-2">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl flex-shrink-0">{DOC_TYPE_ICONS[doc.type]}</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                                    <p className="text-xs text-gray-500">
                                        {DOC_TYPE_LABELS[doc.type]} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                                    </p>
                                    {doc.notes && <p className="text-xs text-gray-400 truncate">{doc.notes}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                                    ↓ Download
                                </Button>
                                {isLandlord && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(doc)}
                                        disabled={deletingId === doc.id}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        {deletingId === doc.id ? '...' : 'Delete'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
