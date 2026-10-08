import { ApiService } from './base';

// Chats are uploaded in parts of at most this many characters (backend MAX_CHAT_CHUNK_CHARS)
const CHAT_PART_CHARS = 1000000;
// A new chat message starts with a date, e.g. "12/31/23, 10:30 PM - ", "[31.12.2023 ", "2023-12-31 "
const MESSAGE_START = /^\[?\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/;
// Long chats can take a while to analyze on the free-tier server
const IMPORT_TIMEOUT_MS = 60 * 60 * 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Split a chat at message boundaries so a multi-line message never straddles two parts
export const splitChatIntoParts = (text, maxChars = CHAT_PART_CHARS) => {
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      let cut = text.lastIndexOf('\n', end - 1);
      while (cut > start && !MESSAGE_START.test(text.slice(cut + 1, cut + 25))) {
        cut = text.lastIndexOf('\n', cut - 1);
      }
      if (cut <= start) cut = text.lastIndexOf('\n', end - 1); // no message start found: any line break
      if (cut > start) end = cut + 1;
    }
    parts.push(text.slice(start, end));
    start = end;
  }
  return parts;
};

// Retry network errors and 5xx responses (e.g. the server waking up or restarting), not 4xx
const withRetry = async (request, attempts = 5) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      const transient = error instanceof TypeError || /^HTTP 5\d\d/.test(error.message || '');
      if (!transient || attempt >= attempts) throw error;
      await sleep(3000 * 2 ** (attempt - 1));
    }
  }
};

export class AnalysisService extends ApiService {
  // Single message analysis
  async analyzeMessage(message, language = null) {
    const body = { message };
    if (language) body.language = language;
    return this.request('/analysis/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Get supported languages for UI dropdowns
  async getSupportedLanguages() {
    return this.request('/analysis/languages');
  }

  // Bulk message analysis
  async analyzeBulkMessages(messages) {
    return this.request('/analysis/analyze-bulk', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  }

  // Analysis history
  async getAnalysisHistory(limit = 50, offset = 0) {
    const params = new URLSearchParams({ 
      limit: limit.toString(), 
      offset: offset.toString() 
    });
    return this.request(`/analysis/history?${params}`);
  }

  // Get specific analysis
  async getAnalysisById(analysisId) {
    return this.request(`/analysis/history/${analysisId}`);
  }

  // Delete analysis
  async deleteAnalysis(analysisId) {
    return this.request(`/analysis/history/${analysisId}`, {
      method: 'DELETE',
    });
  }

  // Delete all analyses for a specific date
  async deleteAnalysesByDate(date) {
    // date should be in format: YYYY-MM-DD (e.g., "2025-11-07")
    return this.request(`/analysis/history/by-date/${date}`, {
      method: 'DELETE',
    });
  }

  // Batch delete analyses
  async deleteMultipleAnalyses(analysisIds) {
    const deletePromises = analysisIds.map(id => this.deleteAnalysis(id));
    return Promise.allSettled(deletePromises);
  }

  // Chat import and analysis
  async importChat(data) {
    return this.request('/analysis/import-chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Import a chat of any size: upload it in parts, then wait for the server to analyze it.
  // onProgress receives { stage: 'upload' | 'analyze', done, total }.
  async importChatInParts(content, options, onProgress = () => {}) {
    const parts = splitChatIntoParts(content);
    const { import_id: importId } = await withRetry(() => this.request('/analysis/import-chat/start', {
      method: 'POST',
      body: JSON.stringify(options),
    }));

    for (let index = 0; index < parts.length; index++) {
      onProgress({ stage: 'upload', done: index, total: parts.length });
      await withRetry(() => this.request(`/analysis/import-chat/${importId}/chunk`, {
        method: 'POST',
        body: JSON.stringify({ index, content: parts[index] }),
      }));
    }

    onProgress({ stage: 'analyze', done: 0, total: 0 });
    await withRetry(() => this.request(`/analysis/import-chat/${importId}/finish`, { method: 'POST' }));

    const deadline = Date.now() + IMPORT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(2000);
      const status = await withRetry(() => this.request(`/analysis/import-chat/${importId}`));
      if (status.status === 'done') return status.result;
      if (status.status === 'failed') throw new Error(status.error || 'Chat analysis failed');
      onProgress({ stage: 'analyze', done: status.processed, total: status.total });
    }
    throw new Error('Chat analysis is taking too long. Please check Chat History later.');
  }

  // Get chat analysis history
  async getChatAnalysisHistory(limit = 20, offset = 0) {
    const params = new URLSearchParams({ 
      limit: limit.toString(), 
      offset: offset.toString() 
    });
    return this.request(`/analysis/chat-history?${params}`);
  }

  // Get specific chat analysis
  async getChatAnalysisById(analysisId) {
    return this.request(`/analysis/chat-history/${analysisId}`);
  }

  // Delete specific chat import by ID
  async deleteChatImport(chatId) {
    return this.request(`/analysis/chat-history/${chatId}`, {
      method: 'DELETE',
    });
  }

  // Delete recent bulk import (legacy - use deleteChatImport instead)
  async deleteRecentBulkImport() {
    return this.request('/analysis/bulk-import/recent', {
      method: 'DELETE',
    });
  }

  // Migrate old bulk imports to add source field
  async migrateBulkImports() {
    return this.request('/analysis/migrate-bulk-imports', {
      method: 'POST',
    });
  }
}

export const analysisService = new AnalysisService();