import React, { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import './VoiceTest.css';

function VoiceTest() {
  const [recordingData, setRecordingData] = useState(null);
  const [transcriptionResult, setTranscriptionResult] = useState(null);

  const handleRecordingComplete = (data) => {
    console.log('Recording complete:', data);
    setRecordingData(data);
  };

  const handleTranscriptionComplete = (data) => {
    console.log('Transcription complete:', data);
    setTranscriptionResult(data);
  };

  return (
    <div className="voice-test">
      <h2>音声録音テスト</h2>
      <p className="voice-test-description">
        このページは開発テスト用です。VoiceRecorder コンポーネントの動作確認を行います。
      </p>

      <VoiceRecorder
        maxDuration={300}
        autoTranscribe={true}
        onRecordingComplete={handleRecordingComplete}
        onTranscriptionComplete={handleTranscriptionComplete}
      />

      {/* デバッグ情報 */}
      {recordingData && (
        <div className="voice-test-debug">
          <h3>録音データ（デバッグ）</h3>
          <pre>{JSON.stringify(recordingData, null, 2)}</pre>
        </div>
      )}

      {transcriptionResult && (
        <div className="voice-test-debug">
          <h3>文字起こし結果（デバッグ）</h3>
          <pre>{JSON.stringify(transcriptionResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default VoiceTest;
