import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import JSZip from 'jszip';
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import Soundfont from 'soundfont-player';
import Header from './components/Header.jsx';
import MidiInput from './components/MidiInput.jsx';
import Settings from './components/Settings.jsx';
import AdvancedSettings from './components/AdvancedSettings.jsx';
import Controls from './components/Controls.jsx';
import PianoRoll from './components/PianoRoll.jsx';
import { GM_INSTRUMENTS } from './constants/instrumentNames';

const API_BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL
  : '';

function App() {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      const code = prompt('Enter debug code:');
      if (code === '963964') {
        setDebugMode(true);
      }
    }
  }, []);

  const [midiData, setMidiData] = useState(null);
  const [originalMidi, setOriginalMidi] = useState(null);
  const [playbackState, setPlaybackState] = useState('stopped');
  const [progress, setProgress] = useState(0);
  const [samplerLoaded, setSamplerLoaded] = useState(false);
  const [generationLength, setGenerationLength] = useState(12);
  const [instrument, setInstrument] = useState('piano');
  const [tempo, setTempo] = useState(120);
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.95);
  const [p, setP] = useState(0.95);
  const [numGems, setNumGems] = useState(3);
  const [key, setKey] = useState('C M');
  const [selectedInstruments, setSelectedInstruments] = useState([]);

  const [modelInfo, setModelInfo] = useState([]);
  const [generatedMidis, setGeneratedMidis] = useState([]);
  const [selectedGeneratedMidi, setSelectedGeneratedMidi] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [chords, setChords] = useState({});
  const [debugInfo, setDebugInfo] = useState(null);
  const [trackMutes, setTrackMutes] = useState({});
  const [trackSolos, setTrackSolos] = useState({});

  const scheduledEventsRef = useRef([]);
  const pianoRollRef = useRef();

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/model_info`, { method: 'POST' });
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        const modelArray = Object.values(data);
        setModelInfo(modelArray);
      } catch (error) {
        console.error('Failed to fetch model info:', error);
        setNotification({ open: true, message: `Failed to load model list: ${error.message}`, severity: 'error' });
      }
    };

    fetchModelInfo();
  }, []);

  const [instruments, setInstruments] = useState([]);

  useEffect(() => {
    console.log('Instrument loading effect running');
    setSamplerLoaded(false);

    // Dispose old instruments and gains
    instruments.forEach(inst => {
      if (inst.type === 'tone') {
        inst.player.dispose();
      }
      // Native gains don't have dispose, just disconnect
      if (inst.gain) {
        inst.gain.disconnect();
      }
    });

    if (!midiData) {
      console.log('No midiData, resetting instruments');
      setInstruments([]);
      setSamplerLoaded(true);
      return;
    }

    const loadInstruments = async () => {
      const promises = midiData.tracks.map(async (track, i) => {
        const program = track.instrument.number;
        const isDrum = track.instrument.percussion || track.channel === 9;

        // Create a native Gain node for volume control
        const gainNode = Tone.context.createGain();
        Tone.connect(gainNode, Tone.Destination);

        let player;
        let type;

        console.log(`Loading track ${i}: Program ${program}, Drum: ${isDrum}`);

        if (isDrum) {
          type = 'tone';
          console.log('Loading Salamander Drumkit...');
          player = new Tone.Sampler({
            urls: {
              35: "kick_OH_FF_1.wav",
              36: "kick2_OH_FF_1.wav",
              37: "snareStick_OH_F_1.wav",
              38: "snare_OH_FF_1.wav",
              40: "snare2_OH_FF_1.wav",
              41: "loTom_OH_FF_1.wav",
              42: "hihatClosed_OH_F_1.wav",
              43: "loTom_OH_FF_6.wav",
              44: "hihatFoot_OH_MP_1.wav",
              45: "hiTom_OH_FF_1.wav",
              46: "hihatOpen_OH_FF_1.wav",
              47: "hiTom_OH_FF_1.wav",
              48: "hiTom_OH_FF_4.wav",
              49: "crash1_OH_FF_1.wav",
              50: "hiTom_OH_FF_8.wav",
              51: "ride1_OH_FF_1.wav",
              52: "china1_OH_FF_1.wav",
              53: "ride1Bell_OH_F_1.wav",
              55: "splash1_OH_F_1.wav",
              57: "crash2_OH_FF_1.wav",
              59: "ride2_OH_FF_1.wav",
            },
            baseUrl: "drums/OH/",
            onload: () => {
              console.log('Salamander Drumkit loaded!');
            }
          });
          player.connect(gainNode);
          // Tone.Sampler is async but we want to wait for it?
          // Actually Tone.loaded() waits for all buffers.
          await Tone.loaded();
        } else if (program >= 0 && program <= 7) {
          type = 'tone';
          player = new Tone.Sampler({
            urls: {
              A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
              C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3', C3: 'C3.mp3',
              'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3',
              'F#4': 'Fs4.mp3', A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
              A5: 'A5.mp3', C6: 'C6.mp3',
            },
            release: 1,
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
          });
          player.connect(gainNode);
          await Tone.loaded();
        } else {
          type = 'soundfont';
          const instrumentName = GM_INSTRUMENTS[program] || 'acoustic_grand_piano';
          console.log(`Fetching Soundfont: ${instrumentName}`);
          try {
            player = await Soundfont.instrument(Tone.context.rawContext, instrumentName, {
              destination: gainNode,
              soundfont: 'FluidR3_GM'
            });
          } catch (e) {
            console.error(`Failed to load soundfont ${instrumentName}, falling back to synth`, e);
            type = 'tone';
            player = new Tone.PolySynth(Tone.Synth);
            player.connect(gainNode);
          }
        }

        return { player, gain: gainNode, type };
      });

      try {
        const loadedInstruments = await Promise.all(promises);
        console.log('All instruments loaded');
        setInstruments(loadedInstruments);
        setSamplerLoaded(true);
      } catch (error) {
        console.error('Error loading instruments:', error);
        setSamplerLoaded(true); // Proceed anyway?
      }
    };

    loadInstruments();

    return () => {
      // Cleanup function (handled at start of effect)
    };
  }, [midiData]);

  // Sync Mutes/Solos with Instruments
  useEffect(() => {
    const isSoloActive = Object.values(trackSolos).some(s => s);
    instruments.forEach((inst, index) => {
      if (inst && inst.gain) {
        let shouldPlay = true;
        if (isSoloActive) {
          shouldPlay = trackSolos[index];
        } else {
          shouldPlay = !trackMutes[index];
        }
        inst.gain.gain.value = shouldPlay ? 1 : 0;
      }
    });
  }, [trackMutes, trackSolos, instruments]);

  useEffect(() => {
    console.log('Scheduling effect running', {
      midiData: !!midiData,
      samplerLoaded,
      instrumentsLength: instruments.length,
      tracksLength: midiData?.tracks.length
    });

    if (midiData && samplerLoaded && instruments.length === midiData.tracks.length) {
      console.log('Starting scheduling...');
      scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
      scheduledEventsRef.current = [];

      const newScheduledEvents = [];

      midiData.tracks.forEach((track, index) => {
        const instObj = instruments[index];
        if (instObj) {
          track.notes.forEach(note => {
            const eventId = Tone.Transport.schedule(time => {
              if (instObj.type === 'tone') {
                instObj.player.triggerAttackRelease(note.name, note.duration, time, note.velocity);
              } else if (instObj.type === 'soundfont') {
                // soundfont-player play method: play(note, time, { duration, gain })
                // Note: time is AudioContext time. Tone.Transport.schedule passes AudioContext time.
                instObj.player.play(note.name, time, {
                  duration: note.duration,
                  gain: note.velocity
                });
              }
            }, note.time);
            newScheduledEvents.push(eventId);
          });
        }
      });

      console.log(`Scheduled ${newScheduledEvents.length} events`);
      scheduledEventsRef.current = newScheduledEvents;

      Tone.Transport.loop = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = midiData.duration;
    }
  }, [midiData, samplerLoaded, instruments]);

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  const handleMidiUpload = (newMidiData) => {
    if (playbackState !== 'stopped') {
      handleStop();
    }
    setTrackMutes({}); // Reset mutes
    setMidiData(newMidiData);
    setOriginalMidi(newMidiData);
    setGeneratedMidis([]);
    if (newMidiData.header.tempos.length > 0) {
      setTempo(Math.round(newMidiData.header.tempos[0].bpm));
    }
  };

  const handlePlay = async () => {
    console.log('handlePlay called', { midiData: !!midiData, samplerLoaded });
    if (!midiData || !samplerLoaded) return;
    if (Tone.context.state !== 'running') await Tone.start();
    Tone.Transport.start();
    setPlaybackState('playing');
  };

  const handlePause = () => {
    Tone.Transport.pause();
    setPlaybackState('paused');
  };

  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setProgress(0);
    setPlaybackState('stopped');
  };

  const handleSeek = (time) => {
    Tone.Transport.position = time;
    setProgress(Tone.Transport.progress);
  };

  const getChordText = (chord) => {
    if (!chord) return '';
    const quality = chord.quality === 'None' ? '' : chord.quality;
    const base = chord.base === 'None' ? '' : chord.base;
    return `${chord.root}${quality}${base}`;
  }

  const handleGenerate = async () => {
    if (!selectedModel) {
      setNotification({ open: true, message: "Please select a model from the Settings dropdown first.", severity: 'warning' });
      return;
    }
    const modelObject = modelInfo.find(model => model.model_name === selectedModel);
    const modelType = modelObject?.tag?.model;

    if (!originalMidi && modelType !== 'pretrained') {
      setNotification({ open: true, message: "Please upload a MIDI file first.", severity: 'warning' });
      return;
    }

    const notes = pianoRollRef.current?.getSelectedNotes() || [];
    if (notes.length === 0 && modelType !== 'pretrained') {
      setNotification({ open: true, message: "ピアノロールで生成元の小節を選択してください。", severity: 'warning' });
      return;
    }

    setIsGenerating(true);
    setNotification({ open: true, message: "Generating... Please wait.", severity: 'info' });
    setGeneratedMidis([]);

    const midi = new Midi();
    const track = midi.addTrack();
    notes.forEach(note => {
      track.addNote({ midi: note.midi, time: note.time, duration: note.duration, velocity: note.velocity });
    });

    const midiBlob = new Blob([midi.toArray()], { type: 'audio/midi' });

    const meta = {
      model_type: selectedModel,
      program: selectedInstruments,
      tempo: tempo,
      task: "MUSICGEM",
      p: p,
      temperature: temperature,
      split_measure: 99,
      key: key.replace(' ', ''),
      num_gems: numGems
    };

    if (modelType === 'sft' && originalMidi) {
      const promptEndTime = notes.reduce((max, note) => Math.max(max, note.time + note.duration), 0);

      const bpm = originalMidi?.header.tempos[0]?.bpm || 120;
      const timeSignature = originalMidi?.header.timeSignatures[0]?.timeSignature || [4, 4];
      const beatsPerMeasure = timeSignature[0];
      const secondsPerBeat = 60 / bpm;
      const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;

      const allChordTimings = Object.entries(chords).map(([key, value]) => {
        const [measure, beat] = key.split('-').map(Number);
        const startTime = (measure * secondsPerMeasure) + (beat * secondsPerBeat);
        return { chord: value, startTime };
      });

      const subsequentChords = allChordTimings.filter(c => c.startTime >= promptEndTime);

      meta.chord_item = subsequentChords.map(c => getChordText(c.chord));
      meta.chord_times = subsequentChords.map(c => c.startTime - promptEndTime);
    }

    if (debugMode) {
      setDebugInfo({ meta });
    }

    const metaBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });

    const formData = new FormData();
    formData.append('midi', midiBlob, 'input.mid');
    formData.append('meta_json', metaBlob, 'meta.json');

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, { method: 'POST', body: formData });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/zip")) {
          const blob = await response.blob();
          const zip = await JSZip.loadAsync(blob);
          const midiPromises = [];
          const jsonPromises = [];

          zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.name.endsWith('.mid')) {
              midiPromises.push(zipEntry.async('arraybuffer').then(buffer => new Midi(buffer)));
            } else if (zipEntry.name.endsWith('.json')) {
              jsonPromises.push(zipEntry.async('string'));
            }
          });

          const loadedMidis = await Promise.all(midiPromises);
          const loadedJsons = await Promise.all(jsonPromises);

          if (loadedJsons.length > 0) {
            setNotification({ open: true, message: loadedJsons.join('\n'), severity: 'info' });
          } else if (loadedMidis.length > 0) {
            setGeneratedMidis(loadedMidis);
            setSelectedGeneratedMidi(0);
            setNotification({ open: true, message: `Successfully generated ${loadedMidis.length} MIDI file(s).`, severity: 'success' });
          } else {
            setNotification({ open: true, message: 'Generation complete, but no relevant files were produced.', severity: 'warning' });
          }
        } else if (contentType && (contentType.includes("audio/midi") || contentType.includes("application/x-midi"))) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const midi = new Midi(arrayBuffer);
          setGeneratedMidis([midi]);
          setSelectedGeneratedMidi(0);
          setNotification({ open: true, message: `Successfully generated MIDI file.`, severity: 'success' });
        } else {
          // Fallback for unknown content type, try to parse as MIDI if possible or error
          try {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            setGeneratedMidis([midi]);
            setSelectedGeneratedMidi(0);
            setNotification({ open: true, message: `Successfully generated MIDI file (fallback).`, severity: 'success' });
          } catch (e) {
            setNotification({ open: true, message: `Unknown response format: ${contentType}`, severity: 'error' });
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Generation failed response:', errorText);
        let errorMessage = errorText;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'object'
              ? JSON.stringify(errorData.detail, null, 2)
              : errorData.detail;
          }
        } catch (e) {
          // Not JSON
        }
        setNotification({ open: true, message: `Generation failed: ${errorMessage || response.statusText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error during generation:', error);
      setNotification({ open: true, message: `An error occurred: ${error.message}`, severity: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const modelObject = modelInfo.find(model => model.model_name === selectedModel);
    const modelType = modelObject?.tag?.model;

    const generatedMidi = generatedMidis[selectedGeneratedMidi];

    if (!modelType || !generatedMidi) return;

    // If we have generated midis, we should display them.
    // For pretrained, we don't need originalMidi.
    // For sft, we need originalMidi to combine.


    if (modelType === 'pretrained') {
      setMidiData(generatedMidi);
    } else if (modelType === 'sft') {
      const newMidi = new Midi();
      newMidi.header = originalMidi.header;

      const promptNotes = pianoRollRef.current.getSelectedNotes();
      const promptEndTime = promptNotes.reduce((max, note) => Math.max(max, note.time + note.duration), 0);

      const track = newMidi.addTrack();

      originalMidi.tracks.forEach((originalTrack, index) => {
        if (trackMutes[index]) return; // Skip muted tracks in generation prompt

        originalTrack.notes.forEach(note => {
          if (note.time < promptEndTime) {
            track.addNote(note);
          }
        });
      });

      generatedMidi.tracks.forEach(generatedTrack => {
        generatedTrack.notes.forEach(note => {
          track.addNote({ ...note, time: note.time + promptEndTime });
        });
      });
      setMidiData(newMidi);
    }
  }, [generatedMidis, selectedGeneratedMidi, originalMidi, modelInfo, selectedModel, trackMutes]);


  useEffect(() => {
    if (playbackState === 'playing') {
      const id = Tone.Transport.scheduleRepeat(time => {
        Tone.Draw.schedule(() => setProgress(Tone.Transport.progress), time);
      }, '16n');
      return () => Tone.Transport.clear(id);
    }
  }, [playbackState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (playbackState === 'playing') handlePause();
        else handlePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState, handlePlay, handlePause]);

  const toggleMute = (trackIndex) => {
    setTrackMutes(prev => ({
      ...prev,
      [trackIndex]: !prev[trackIndex]
    }));
  };

  const toggleSolo = (trackIndex) => {
    setTrackSolos(prev => ({
      ...prev,
      [trackIndex]: !prev[trackIndex]
    }));
  };

  const deleteTrack = (trackIndex) => {
    if (!midiData) return;
    const newMidiData = { ...midiData };
    newMidiData.tracks.splice(trackIndex, 1);
    setMidiData({ ...newMidiData });
    // Also update mutes to shift or remove
    setTrackMutes(prev => {
      const newMutes = {};
      Object.keys(prev).forEach(key => {
        const k = parseInt(key);
        if (k < trackIndex) newMutes[k] = prev[k];
        else if (k > trackIndex) newMutes[k - 1] = prev[k];
      });
      return newMutes;
    });
  };

  const clearAllTracks = () => {
    setMidiData(null);
    setOriginalMidi(null);
    setGeneratedMidis([]);
    setInstruments([]);
    setInstruments([]);
    setTrackMutes({});
    setTrackSolos({});
    handleStop();
  };

  const duration = midiData ? midiData.duration : 0;

  return (
    <div className="h-screen bg-background text-text flex flex-col overflow-hidden">
      {/* Toast Notification */}
      {notification.open && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-lg shadow-lg border flex items-start gap-3 max-w-md animate-in slide-in-from-right-5 fade-in duration-300 ${notification.severity === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
          notification.severity === 'warning' ? 'bg-yellow-900/90 border-yellow-700 text-yellow-100' :
            notification.severity === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
              'bg-blue-900/90 border-blue-700 text-blue-100'
          }`}>
          {notification.severity === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {notification.severity === 'warning' && <AlertCircle className="w-5 h-5 shrink-0" />}
          {notification.severity === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {notification.severity === 'info' && <Info className="w-5 h-5 shrink-0" />}
          <div className="flex-1 text-sm whitespace-pre-wrap break-all">{notification.message}</div>
          <button
            onClick={() => setNotification({ ...notification, open: false })}
            className="text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <Header />

      <main className="flex-1 container mx-auto px-4 pb-4 max-w-[1600px] overflow-hidden">
        {!samplerLoaded ? (
          <div className="flex flex-col justify-center items-center h-full gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-xl text-muted">Loading Samples...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 pb-2">
              <div className="card space-y-6">

                <Settings
                  tempo={tempo}
                  setTempo={setTempo}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  modelInfo={modelInfo}
                  debugMode={debugMode}
                  keySelection={key}
                  setKey={setKey}
                  selectedInstruments={selectedInstruments}
                  setSelectedInstruments={setSelectedInstruments}
                />
                <AdvancedSettings
                  temperature={temperature}
                  setTemperature={setTemperature}
                  p={p}
                  setP={setP}
                  numGems={numGems}
                  setNumGems={setNumGems}
                  rules={modelInfo.find(m => m.model_name === selectedModel)?.rule}
                />
              </div>

              <div className="card">
                <Controls
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStop={handleStop}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  playbackState={playbackState}
                  progress={progress}
                  duration={duration}
                  generatedMidis={generatedMidis}
                  selectedGeneratedMidi={selectedGeneratedMidi}
                  onSelectedGeneratedMidiChange={setSelectedGeneratedMidi}
                />
              </div>

              {debugMode && debugInfo && (
                <div className="p-4 border border-dashed border-border bg-surface/30 rounded-lg">
                  <h6 className="text-lg font-semibold mb-2">Debug Information</h6>
                  <pre className="whitespace-pre-wrap break-all text-xs font-mono text-muted">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 h-full flex flex-col min-h-[400px]">
              <div className="card h-full flex flex-col p-0 overflow-hidden">
                {midiData ? (
                  <PianoRoll
                    ref={pianoRollRef}
                    midiData={midiData}
                    progress={progress}
                    duration={duration}
                    generationLength={generationLength}
                    setGenerationLength={setGenerationLength}
                    onSeek={handleSeek}
                    onChordsChange={setChords}
                    onMute={toggleMute}
                    onSolo={toggleSolo}
                    onDelete={deleteTrack}
                    onClear={clearAllTracks}
                    trackMutes={trackMutes}
                    trackSolos={trackSolos}
                  />
                ) : (
                  <div className="h-full p-6">
                    {(() => {
                      const currentModel = modelInfo.find(m => m.model_name === selectedModel);
                      const inputMidiAllowed = currentModel?.rule?.input_midi !== false;

                      if (inputMidiAllowed) {
                        return <MidiInput onMidiUpload={handleMidiUpload} />;
                      } else {
                        // Create a default empty MIDI object for display
                        const emptyMidi = new Midi();
                        // Add a dummy track so PianoRoll doesn't crash or look broken
                        emptyMidi.addTrack();
                        // We need to set this as midiData to trigger the PianoRoll render
                        // But we can't do it inside render. 
                        // Instead, we'll render a placeholder or trigger an effect.
                        // Better approach: If input_midi is false, we should probably auto-initialize midiData 
                        // or just render the PianoRoll with a dummy object directly here without setting state if we don't want to persist it yet.
                        // However, PianoRoll expects midiData prop.
                        // Let's use a temporary empty midi object just for rendering if we want to show "empty piano roll".

                        // Actually, the requirement says: "Inputフォームの代わりに空のピアノロールを表示してください。"
                        // If I just render PianoRoll here with empty data, it might work.

                        // Let's create a memoized empty midi to avoid recreation
                        const dummyMidi = new Midi();
                        const track = dummyMidi.addTrack();
                        // Add C4 quarter note to make it not completely empty if needed, or just leave empty.

                        return (
                          <PianoRoll
                            ref={pianoRollRef}
                            midiData={dummyMidi}
                            progress={progress}
                            duration={duration}
                            generationLength={generationLength}
                            setGenerationLength={setGenerationLength}
                            onSeek={handleSeek}
                            onChordsChange={setChords}
                            onMute={toggleMute}
                            onSolo={toggleSolo}
                            onDelete={deleteTrack}
                            onClear={clearAllTracks}
                            trackMutes={trackMutes}
                            trackSolos={trackSolos}
                          />
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
