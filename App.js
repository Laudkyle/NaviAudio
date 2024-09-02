import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { AudioRecorder, AudioUtils } from '@react-native-community/audio-toolkit';
import RNFS from 'react-native-fs';
import TFLite from 'react-native-fast-tflite';

export default function App() {
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState('Hold to record');
  const [model, setModel] = useState(null);
  const recordingRef = useRef(null);
  const tflite = new TFLite();

  useEffect(() => {
    async function loadModel() {
      try {
        await tflite.loadModel({
          model: 'assets/model/model.tflite', // Path to your TFLite model
        });
        setModel(tflite);
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Error loading model:', error);
      }
    }

    loadModel();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);

      if (
        granted['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted['android.permission.READ_EXTERNAL_STORAGE'] !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.error('Permissions not granted');
        return false;
      }
    }
    return true;
  };

  const startRecording = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const filePath = `${AudioUtils.DocumentDirectoryPath}/recording.wav`;
    recordingRef.current = new AudioRecorder(filePath, {
      quality: 'high',
      channels: 1,
      sampleRate: 16000,
      bitsPerSample: 16,
      wavFile: true,
    });

    recordingRef.current.prepare((err) => {
      if (err) {
        console.error('Error preparing recorder:', err);
        return;
      }

      setRecording(true);
      recordingRef.current.record((err) => {
        if (err) {
          console.error('Error during recording:', err);
        } else {
          setMessage('Recording...');
        }
      });
    });
  };

  const stopRecording = async () => {
    if (recordingRef.current) {
      recordingRef.current.stop((err) => {
        if (err) {
          console.error('Error stopping recording:', err);
          setMessage('Error during recording');
          return;
        }

        setRecording(false);
        setMessage('Recording stopped, processing audio...');
        processAudio(recordingRef.current.fsPath);
      });
    }
  };

  const processAudio = async (filePath) => {
    try {
      const audioData = await RNFS.readFile(filePath, 'base64');

      if (model) {
        const inputTensor = preprocessAudioData(audioData);
        tflite.runModelOnBinary(inputTensor, 'input_tensor_name', (err, res) => {
          if (err) {
            console.error('Error during inference:', err);
            setMessage('Error during inference');
          } else {
            console.log('Predictions:', res);
            setMessage('Prediction successful');
          }
        });
      } else {
        setMessage('Model not loaded yet');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setMessage('Error processing audio');
    }
  };

  const preprocessAudioData = (audioData) => {
    // Implement preprocessing steps to convert audio data into the required format for your model
    return new Uint8Array(); // Replace with actual preprocessing
  };

  if (!model) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 20 }}>Loading model...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <TouchableOpacity
        style={{
          width: 150,
          height: 150,
          backgroundColor: '#007bff',
          borderRadius: 75,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPressIn={startRecording}
        onPressOut={stopRecording}
      >
        <Text style={{ color: '#fff', fontSize: 18 }}>{message}</Text>
      </TouchableOpacity>
    </View>
  );
}
