import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface VoiceChefProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper: Base64 Encoding/Decoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const VoiceChef: React.FC<VoiceChefProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const initAudio = async () => {
    if (!audioContextInRef.current) {
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextInRef.current.state === 'suspended') await audioContextInRef.current.resume();
    if (audioContextOutRef.current!.state === 'suspended') await audioContextOutRef.current!.resume();
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      await initAudio();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: '你是一位亲切的专业大厨，名叫"企鹅大厨"。你可以通过语音帮助用户规划菜谱、解答烹饪难题。你的回答要简短、口语化。'
        },
        callbacks: {
          onopen: () => {
            setStatus('listening');
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const processor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              sessionPromise.then(session => {
                session.sendRealtimeInput({ 
                  media: { 
                    data: encode(new Uint8Array(int16.buffer)), 
                    mimeType: 'audio/pcm;rate=16000' 
                  } 
                });
              });
            };
            source.connect(processor);
            processor.connect(audioContextInRef.current!.destination);
            (window as any)._voiceProcessor = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus('speaking');
              const buffer = await decodeAudioData(decode(base64Audio), audioContextOutRef.current!, 24000, 1);
              const source = audioContextOutRef.current!.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextOutRef.current!.destination);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextOutRef.current!.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              
              activeSourcesRef.current.add(source);
              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setStatus('listening');
              };
            }
            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setStatus('idle'),
          onerror: (e) => {
            console.error(e);
            setStatus('idle');
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setStatus('idle');
      alert('无法开启语音助手，请检查麦克风权限。');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    activeSourcesRef.current.forEach(s => s.stop());
    setStatus('idle');
  };

  useEffect(() => {
    if (!isOpen) stopSession();
    return () => stopSession();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-gray-800 rounded-[2.5rem] p-8 shadow-2xl border border-white/10 flex flex-col items-center overflow-hidden animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
        
        <div className="mt-8 mb-12 relative">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
            status !== 'idle' ? 'bg-brand-500 shadow-[0_0_50px_rgba(249,115,22,0.4)]' : 'bg-gray-700'
          }`}>
            {status === 'connecting' ? (
              <Loader2 size={48} className="text-white animate-spin" />
            ) : (
              <Sparkles size={48} className={`text-white ${status === 'speaking' ? 'animate-pulse' : ''}`} />
            )}
          </div>
          {status === 'speaking' && (
            <div className="absolute inset-0 flex items-center justify-center">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className="absolute inset-0 rounded-full border border-brand-500/50 animate-ping" 
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              ))}
            </div>
          )}
        </div>

        <h3 className="text-2xl font-black text-white mb-2">
          {status === 'idle' ? '语音大厨' : 
           status === 'connecting' ? '正在连接...' : 
           status === 'speaking' ? '企鹅大厨正在说' : '正在倾听...'}
        </h3>
        <p className="text-gray-400 text-center text-sm mb-12 px-4 leading-relaxed whitespace-pre-line">
          {status === 'idle' ? '像和朋友聊天一样问我烹饪问题吧！\n“这道番茄炒蛋怎么做？”' : '直接说话即可，我随时待命'}
        </p>

        <div className="flex gap-6">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          
          {status === 'idle' ? (
            <button 
              onClick={startSession} 
              className="w-16 h-16 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
              <Mic size={28} />
            </button>
          ) : (
            <button 
              onClick={stopSession} 
              className="w-16 h-16 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
              <Volume2 size={28} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};