import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Send,
  Upload,
  FileText,
  Trash2,
  Loader,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';

const Assistant = () => {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null); // { answer, sources, provider, model, tookMs }
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const fileInputRef = useRef(null);

  const loadDocuments = async () => {
    try {
      const res = await axios.get('/documents?limit=50');
      setDocuments(res.data.documents || []);
      return res.data.documents || [];
    } catch (error) {
      toast.error('Could not load documents');
      return [];
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Refresh while any document is still processing
  useEffect(() => {
    if (documents.some((d) => d.status === 'processing')) {
      const timer = setTimeout(loadDocuments, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [documents]);

  const onUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const res = await axios.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message || 'Document uploaded');
      await loadDocuments();
    } catch (error) {
      const message = error.response?.data?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDelete = async (id) => {
    try {
      await axios.delete(`/documents/${id}`);
      toast.success('Document deleted');
      await loadDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const onAsk = async (event) => {
    event.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    setResult(null);
    try {
      const res = await axios.post('/ai/query', { question: question.trim() });
      setResult(res.data);
    } catch (error) {
      const message = error.response?.data?.message || 'Could not answer the question';
      toast.error(message);
    } finally {
      setAsking(false);
    }
  };

  const statusChip = (status) => {
    const map = {
      ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return map[status] || map.processing;
  };

  return (
    <div className="space-y-6" data-testid="assistant-page">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" /> AI Assistant
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Upload documents and ask questions - answers are grounded in your own indexed files with source citations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Documents panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Documents
                <span className="text-xs text-gray-500">({documents.length})</span>
              </h2>
              <label className="cursor-pointer inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload'}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.markdown,.csv,.json,.log,.pdf,.docx"
                  onChange={onUpload}
                  disabled={uploading}
                  data-testid="document-input"
                />
              </label>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {docsLoading ? (
                <div className="flex justify-center py-6"><Loader className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  No documents yet. Upload a .txt, .md, .csv, .pdf or .docx file to get started.
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600"
                    data-testid="document-item"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {doc.chunkCount} chunks · {Math.round((doc.charCount || 0) / 1000)}k chars
                      </p>
                      {doc.statusError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {doc.statusError}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusChip(doc.status)}`}>
                        {doc.status}
                      </span>
                      <button
                        onClick={() => onDelete(doc._id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Question / answer panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Ask your second brain</h2>
            </div>
            <div className="p-4">
              <form onSubmit={onAsk} className="flex gap-2" data-testid="ask-form">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. When is the Aurora project deadline?"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="question-input"
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="ask-button"
                >
                  {asking ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {asking ? 'Thinking…' : 'Ask'}
                </button>
              </form>

              {result && (
                <div className="mt-6" data-testid="answer-block">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{result.answer}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {result.provider && result.model ? `${result.provider} · ${result.model} · ` : ''}
                      {(result.tookMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                  {result.sources && result.sources.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sources</h3>
                      <ul className="space-y-2">
                        {result.sources.map((source) => (
                          <li
                            key={source.ref}
                            className={`p-3 rounded-md border text-xs ${
                              source.cited
                                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                            }`}
                            data-testid="source-item"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              [{source.ref}] {source.document} · part {source.chunkIndex + 1}
                              <span className="ml-2 text-gray-500">relevance {source.score}</span>
                              {source.cited && <span className="ml-2 text-green-600 dark:text-green-400">cited in answer</span>}
                            </p>
                            <p className="mt-1 text-gray-600 dark:text-gray-300 line-clamp-3">{source.excerpt}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.sources && result.sources.length === 0 && (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      No matching documents found. Upload relevant files and try again.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
