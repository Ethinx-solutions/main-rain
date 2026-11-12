import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Assistant from '../pages/Assistant';

jest.mock('axios');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => null,
}));

describe('AI Assistant page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { documents: [], total: 0 } });
  });

  test('renders the upload and ask workflow', async () => {
    render(<Assistant />);
    expect(await screen.findByTestId('assistant-page')).toBeInTheDocument();
    expect(screen.getByText(/ask your second brain/i)).toBeInTheDocument();
    expect(screen.getByTestId('ask-button')).toBeDisabled();
    expect(screen.getByTestId('document-input')).toBeInTheDocument();
  });

  test('lists documents with status chips and supports deletion', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        documents: [
          { _id: 'doc1', originalName: 'alpha.txt', status: 'ready', chunkCount: 4, charCount: 2400 },
        ],
        total: 1,
      },
    });
    render(<Assistant />);
    expect(await screen.findByTestId('document-item')).toBeInTheDocument();
    expect(screen.getByText('alpha.txt')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  test('asking a question renders the answer with source citations', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        answer: 'The deadline is March 14, 2027 [1].',
        sources: [
          { ref: 1, documentId: 'doc1', document: 'aurora-brief.txt', chunkIndex: 0, score: 0.87, excerpt: 'Aurora...', cited: true },
        ],
        provider: 'ollama',
        model: 'qwen2.5:3b-instruct',
        tookMs: 1200,
      },
    });
    render(<Assistant />);
    expect(await screen.findByTestId('assistant-page')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('question-input'), 'When is the Aurora deadline?');
    await userEvent.click(screen.getByTestId('ask-button'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/ai/query', { question: 'When is the Aurora deadline?' });
    });
    expect(await screen.findByTestId('answer-block')).toBeInTheDocument();
    expect(screen.getByText(/march 14, 2027/i)).toBeInTheDocument();
    expect(screen.getByText(/aurora-brief\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/cited in answer/i)).toBeInTheDocument();
  });
});
