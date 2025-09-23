import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, CssBaseline, Box, ThemeProvider, createTheme, Grid, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import JSZip from 'jszip';
import Header from './components/Header.jsx';
import MidiInput from './components/MidiInput.jsx';
import Settings from './components/Settings.jsx';
import AdvancedSettings from './components/AdvancedSettings.jsx';
import Controls from './components/Controls.jsx';
import PianoRoll from './components/PianoRoll.jsx';

const API_BASE_URL = import.meta.env.PROD
  ? 'https://8d4f2be12ab2.ngrok-free.app'
  : '';

function App() {
  const [mode, setMode] = useState('dark');
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

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

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

  const [modelInfo, setModelInfo] = useState([]);
  const [generatedMidis, setGeneratedMidis] = useState([]);
  const [selectedGeneratedMidi, setSelectedGeneratedMidi] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [isGenerating, setIsGenerating] = useState(false);

  const samplerRef = useRef(null);
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

  useEffect(() => {
    setSamplerLoaded(false);
    if (samplerRef.current) {
      samplerRef.current.dispose();
    }

    if (instrument === 'piano') {
      samplerRef.current = new Tone.Sampler({
        urls: {
          A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
          C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3', C3: 'C3.mp3',
          'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3', A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
          A5: 'A5.mp3', C6: 'C6.mp3',
        },
        release: 1,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
        onload: () => setSamplerLoaded(true)
      }).toDestination();
    } else if (instrument === 'saxophone') {
      samplerRef.current = new Tone.FMSynth().toDestination();
      setSamplerLoaded(true);
    }
  }, [instrument]);

  useEffect(() => {
    if (midiData && samplerLoaded) {
      scheduledEventsRef.current.forEach(id => Tone.Transport.clear(id));
      scheduledEventsRef.current = [];

      const notes = midiData.tracks.flatMap(track => track.notes);
      const scheduledEvents = notes.map(note =>
        Tone.Transport.schedule(time => {
          if (samplerRef.current) {
            samplerRef.current.triggerAttackRelease(note.name, note.duration, time, note.velocity);
          }
        }, note.time)
      );
      scheduledEventsRef.current = scheduledEvents;

      Tone.Transport.loop = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd = midiData.duration;
    }
  }, [midiData, samplerLoaded]);

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  const handleMidiUpload = (newMidiData) => {
    if (playbackState !== 'stopped') {
      handleStop();
    }
    setMidiData(newMidiData);
    setOriginalMidi(newMidiData);
    setGeneratedMidis([]);
    if (newMidiData.header.tempos.length > 0) {
      setTempo(Math.round(newMidiData.header.tempos[0].bpm));
    }
  };

  const handlePlay = async () => {
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

  const handleGenerate = async () => {
    if (!selectedModel) {
      setNotification({ open: true, message: "Please select a model from the Settings dropdown first.", severity: 'warning' });
      return;
    }
    if (!originalMidi) {
      setNotification({ open: true, message: "Please upload a MIDI file first.", severity: 'warning' });
      return;
    }

    const notes = pianoRollRef.current.getSelectedNotes();
    if (notes.length === 0) {
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
    const meta = { model_type: selectedModel, program: [0], tempo: tempo, task: "MELODY_GEM", p: p, split_measure: 99, num_gems: numGems };
    const metaBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });

    const formData = new FormData();
    formData.append('midi', midiBlob, 'input.mid');
    formData.append('meta_json', metaBlob, 'meta.json');

    try {
      const response = await fetch(`${API_BASE_URL}/generate`, { method: 'POST', body: formData });

      if (response.ok) {
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
      } else {
        const errorData = await response.json();
        setNotification({ open: true, message: `Generation failed: ${errorData.detail || response.statusText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error during generation:', error);
      setNotification({ open: true, message: `An error occurred: ${error.message}`, severity: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (generatedMidis.length === 0 || !originalMidi || !modelInfo) {
      if (originalMidi) setMidiData(originalMidi);
      return;
    }

    const modelObject = modelInfo.find(model => model.model_name === selectedModel);
    const modelType = modelObject?.tag?.model;

    const generatedMidi = generatedMidis[selectedGeneratedMidi];

    if (!modelType || !generatedMidi) return;

    if (modelType === 'pretrained') {
      setMidiData(generatedMidi);
    } else if (modelType === 'sft') {
      const newMidi = new Midi();
      newMidi.header = originalMidi.header;

      const promptNotes = pianoRollRef.current.getSelectedNotes();
      const promptEndTime = promptNotes.reduce((max, note) => Math.max(max, note.time + note.duration), 0);

      const track = newMidi.addTrack();

      originalMidi.tracks.forEach(originalTrack => {
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
  }, [generatedMidis, selectedGeneratedMidi, originalMidi, modelInfo, selectedModel]);


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

  const duration = midiData ? midiData.duration : 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Snackbar
        open={notification.open}
        autoHideDuration={isGenerating ? null : 6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
      <Header toggleColorMode={toggleColorMode} mode={theme.palette.mode} />
      <Container maxWidth="xl" sx={{ my: 2 }}>
        {!samplerLoaded ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading Samples...</Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <MidiInput onMidiUpload={handleMidiUpload} />
              <Settings
                instrument={instrument}
                setInstrument={setInstrument}
                tempo={tempo}
                setTempo={setTempo}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                modelInfo={modelInfo}
                debugMode={debugMode}
              />
              <AdvancedSettings
                temperature={temperature}
                setTemperature={setTemperature}
                p={p}
                setP={setP}
                numGems={numGems}
                setNumGems={setNumGems}
              />
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
            </Grid>
            <Grid item xs={12} md={7}>
              <PianoRoll
                ref={pianoRollRef}
                midiData={midiData}
                progress={progress}
                duration={duration}
                generationLength={generationLength}
                setGenerationLength={setGenerationLength}
                onSeek={handleSeek}
              />
            </Grid>
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
