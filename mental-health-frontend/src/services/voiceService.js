import { ApiService } from './base';

export class VoiceService extends ApiService {
  // Transcribe audio file
  async transcribeAudio(audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile);

    return this.request('/api/voice/transcribe', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // Check voice service status
  async getStatus() {
    return this.request('/api/voice/status');
  }
}

export const voiceService = new VoiceService();
