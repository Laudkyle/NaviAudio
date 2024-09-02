import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';



export default function App() {
  const [recording, setRecording] = useState(null);
  const [message, setMessage] = useState('Hold to record');
  const [model, setModel] = useState(null);
  const recordingRef = useRef(null);

  useEffect(() => {
    async function loadModel() {
      try {
        // Ensure TensorFlow is ready to use
        await tf.ready();

        // Load the model and weights using bundleResourceIO
        const modelJson = await require('./assets/model/model.json');
        const modelWeights = [
          require('./assets/model/group1-shard1of1.bin'),
        ];

        // Load model with bundled resources
        const model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights));
        setModel(model);
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Error loading model:', error);
      }
    }

    loadModel();
  }, []);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access microphone was denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setRecording(recording);
      setMessage('Recording...');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setRecording(null);
      setMessage('Recording stopped, sending audio...');
      
      // Save the recorded file locally
      const fileUri = `${FileSystem.documentDirectory}recording.wav`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      // Load and preprocess audio
      const audioData = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });

      // Predict using the TensorFlow.js model
      if (model) {
        const inputTensor = tf.tensor([new Float32Array(decode(audioData))]); // Adjust preprocessing as necessary
        const predictions = await model.predict(inputTensor).data();
        console.log('Predictions:', predictions);
        setMessage('Prediction successful');
      } else {
        setMessage('Model not loaded yet');
      }
    } catch (error) {
      console.error('Error during recording:', error);
      setMessage('Error during recording');
    }
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
