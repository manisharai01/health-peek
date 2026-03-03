import React, { useState } from 'react';
import { voiceService } from '../../services';
import { useAnalysis } from '../../context/AnalysisContext';
import { LoadingSpinner, ErrorMessage } from '../common';

const VoiceAnalyzer = () => {
  const { addAnalysis } = useAnalysis();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await voiceService.transcribeAudio(file);
      setResult(response);
      if (response?.data?.text) {
        await addAnalysis(response.data.text, response);
      }
    } catch (err) {
      setError(err.message || 'Voice analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="voice-analyzer">
      <h3>🎤 Voice Analysis</h3>
      <p>Upload an audio file to transcribe and analyze.</p>

      <div className="voice-upload">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          disabled={isProcessing}
        />
      </div>

      {isProcessing && <LoadingSpinner message="Processing audio..." />}
      {error && <ErrorMessage message={error} />}

      {result && (
        <div className="voice-result">
          <h4>Transcription</h4>
          <p>{result?.data?.text || 'No transcription available'}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceAnalyzer;
