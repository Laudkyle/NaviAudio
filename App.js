import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';
import { TailwindProvider, tw } from '@tailwindcssinexpo/react-native-tailwind';

export default function App() {
  const [recording, setRecording] = useState(null);
  const [message, setMessage] = useState('Hold to record');
  const recordingRef = useRef(null);

  const startRecording = async () => {
    try {
      console.log('Requesting permissions...');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording...');
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
    console.log('Stopping recording...');
    recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    setRecording(null);
    setMessage('Recording stopped, sending audio...');

    // Send the audio file
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: 'recording.wav',
      type: 'audio/wav',
    });

    try {
      const response = await axios.post(
        'https://navi-audio-server.onrender.com/predict',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setMessage(`Command: ${response.data.command}, Speaker: ${response.data.speaker}`);
    } catch (err) {
      console.error('Failed to send audio', err);
      setMessage('Failed to send audio');
    }
  };

  return (
    <TailwindProvider>
      <View style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <TouchableOpacity
          style={tw`w-64 h-64 bg-blue-500 rounded-full justify-center items-center`}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        >
          <Text style={tw`text-white text-xl`}>{message}</Text>
        </TouchableOpacity>
      </View>
    </TailwindProvider>
  );
}
