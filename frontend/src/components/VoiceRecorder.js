import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from './Toast';
import './VoiceRecorder.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

// 状態: idle → recording → uploading → transcribing → completed / error
const STATES = {
  IDLE: 'idle',
  RECORDING: 'recording',
  UPLOADING: 'uploading',
  TRANSCRIBING: 'transcribing',
  COMPLETED: 'completed',
  ERROR: 'error'
};

function VoiceRecorder({
  onRecordingComplete,
  maxDuration = 600,
  autoTranscribe = true,
  onTranscriptionComplete
}) {
  const [state, setState] = useState(STATES.IDLE);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const { showToast } = useToast();

  // タイマー更新のクリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // ストリームを停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 経過時間のフォーマット（MM:SS）
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 録音停止の共通処理
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // maxDuration に達したら自動停止
  useEffect(() => {
    if (state === STATES.RECORDING && elapsedTime >= maxDuration) {
      stopRecording();
    }
  }, [state, elapsedTime, maxDuration, stopRecording]);

  // 音声アップロード
  const uploadRecording = async (blob) => {
    setState(STATES.UPLOADING);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await fetch(`${API_URL}/api/recordings`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '音声の保存に失敗しました');
      }

      const recordingData = await response.json();

      if (onRecordingComplete) {
        onRecordingComplete(recordingData);
      }

      // 自動文字起こし
      if (autoTranscribe && recordingData.recording && recordingData.recording.id) {
        await startTranscription(recordingData.recording.id);
      } else {
        setState(STATES.COMPLETED);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.message || '音声のアップロードに失敗しました', 'error');
      setState(STATES.ERROR);
      setErrorMessage(error.message || '音声のアップロードに失敗しました');
    }
  };

  // 文字起こし開始
  const startTranscription = async (recordingId) => {
    setState(STATES.TRANSCRIBING);
    try {
      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recording_id: recordingId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '文字起こしに失敗しました');
      }

      const transcriptionData = await response.json();
      setTranscriptionText((transcriptionData.transcription && transcriptionData.transcription.raw_text) || '');
      setState(STATES.COMPLETED);

      if (onTranscriptionComplete) {
        onTranscriptionComplete(transcriptionData);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      showToast(error.message || '文字起こしに失敗しました', 'error');
      setState(STATES.ERROR);
      setErrorMessage(error.message || '文字起こしに失敗しました');
    }
  };

  // 録音開始
  const handleStartRecording = async () => {
    // MediaRecorder サポートチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('このブラウザは音声録音に対応していません', 'error');
      return;
    }

    // mimeType サポートチェック
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    if (!mimeType) {
      showToast('このブラウザは audio/webm 形式に対応していません', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        uploadRecording(blob);
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setTranscriptionText('');
      setErrorMessage('');
      setState(STATES.RECORDING);

      // タイマー開始
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } catch (error) {
      console.error('getUserMedia error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        showToast('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。', 'error');
      } else {
        showToast('マイクへのアクセスに失敗しました: ' + error.message, 'error');
      }
    }
  };

  // 録音停止ボタンハンドラ
  const handleStopRecording = () => {
    stopRecording();
  };

  // リセット（新規録音）
  const handleReset = () => {
    setState(STATES.IDLE);
    setElapsedTime(0);
    setTranscriptionText('');
    setErrorMessage('');
  };

  // プログレスバーの割合
  const progress = maxDuration > 0 ? Math.min((elapsedTime / maxDuration) * 100, 100) : 0;

  return (
    <div className="voice-recorder">
      {/* 録音開始/停止ボタン */}
      <div className="voice-recorder-controls">
        {state === STATES.IDLE && (
          <button
            className="voice-record-btn"
            onClick={handleStartRecording}
            title="録音開始"
          >
            <span className="record-icon" />
            録音開始
          </button>
        )}

        {state === STATES.RECORDING && (
          <>
            <button
              className="voice-stop-btn"
              onClick={handleStopRecording}
              title="録音停止"
            >
              <span className="stop-icon" />
              録音停止
            </button>

            <div className="recording-indicator">
              <span className="recording-dot" />
              <span className="recording-time">{formatTime(elapsedTime)}</span>
              <span className="recording-remaining">
                / {formatTime(maxDuration)}
              </span>
            </div>

            <div className="recording-progress">
              <div
                className="recording-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {state === STATES.UPLOADING && (
          <div className="voice-loading">
            <span className="voice-spinner" />
            <span>音声を保存中...</span>
          </div>
        )}

        {state === STATES.TRANSCRIBING && (
          <div className="voice-loading">
            <span className="voice-spinner" />
            <span>文字起こし中...(CPUモードのため数十秒〜数分かかります)</span>
          </div>
        )}

        {state === STATES.COMPLETED && (
          <div className="voice-completed">
            <span className="completed-check">&#10003;</span>
            <span>録音・文字起こし完了</span>
            <button className="voice-reset-btn" onClick={handleReset}>
              新規録音
            </button>
          </div>
        )}

        {state === STATES.ERROR && (
          <div className="voice-error">
            <span className="error-icon-text">!</span>
            <span>{errorMessage || 'エラーが発生しました'}</span>
            <button className="voice-reset-btn" onClick={handleReset}>
              再試行
            </button>
          </div>
        )}
      </div>

      {/* 文字起こし結果表示 */}
      {transcriptionText && (
        <div className="voice-transcription">
          <h4>文字起こし結果</h4>
          <div className="transcription-text">{transcriptionText}</div>
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
